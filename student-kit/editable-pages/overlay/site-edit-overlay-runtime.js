/* Site Edit Overlay Runtime. Call window.SiteEditOverlay.install(config). */
(() => {
  const DEFAULTS = {
    toolbar: true,
    autoMapAnchors: true,
    blockSelector: "main > section[id]",
    controlSelector: "nav a[href^='#'], aside a[href^='#'], [data-edit-control-for]",
    sliceContainerSelector: "[data-edit-slice-container], .cards, .grid, .faq-list, .testimonial-grid, .schedule-grid",
    sliceItemSelector: "[data-edit-slice], article, details, li, .card, .tile",
    interactiveSelector: [
      "a",
      "button",
      "summary",
      "[role='button']",
      "[data-tab]",
      "[data-filter]",
      "[data-action]",
      "[data-audience-choice]",
      "[data-domain-filter]",
    ].join(", "),
    saveEndpoint: "/__site_edit_overlay_save",
    saveEndpointCandidates: null,
    save: null,
  };

  function install(userConfig = {}) {
    const config = { ...DEFAULTS, ...userConfig };
    const editableElements = [];
    let enabled = false;
    let saving = false;
    let draggedItem = null;
    let armedDragItem = null;
    let editableRefreshTimer = 0;
    const visibleEditorSpace = "\u00a0";
    const emptyEditableAnchor = "\u200b";

    function visible(node) {
      if (!(node instanceof HTMLElement) || node.hidden || !node.getClientRects().length) return false;
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }

    function isEditableCandidate(node) {
      if (!(node instanceof HTMLElement)) return false;
      if (node.matches("br, wbr")) return false;
      if (node.closest(".seo-toolbar, .seo-drag-handle, script, style, svg, canvas, input, textarea, select, option, iframe, video, audio")) return false;
      const isExistingEditable = node.hasAttribute("data-seo-editable") || node.isContentEditable;
      const isKnownTextShell = node.matches("[data-role-text], [data-role-html], [data-role-title-line], p, h1, h2, h3, h4, h5, h6, summary, dt, dd, li, figcaption");
      if (!node.textContent.trim() && !isExistingEditable && !isKnownTextShell) return false;
      if (!visible(node)) return false;
      const ownText = Array.from(node.childNodes).some((child) => child.nodeType === Node.TEXT_NODE && child.textContent.replaceAll(emptyEditableAnchor, "").trim());
      const childElements = Array.from(node.children).some((child) => child instanceof HTMLElement && !child.matches("br, wbr"));
      return ownText || isExistingEditable || isKnownTextShell || !childElements;
    }

    function collectEditableElements() {
      editableElements.splice(0, editableElements.length);
      const candidates = Array.from(document.body.querySelectorAll("*")).filter(isEditableCandidate);
      document.querySelectorAll("[data-role-title-line]").forEach((node) => {
        if (node instanceof HTMLElement && !candidates.includes(node)) candidates.push(node);
      });
      const normalizedCandidates = candidates.filter((node) => node.matches("[data-role-title-line]") || !node.querySelector("[data-role-title-line]"));
      normalizedCandidates.forEach((node) => {
        if (!normalizedCandidates.some((candidate) => candidate !== node && candidate.contains(node))) editableElements.push(node);
      });
    }

    function showTitleLineEditPlaceholders() {
      document.querySelectorAll("[data-role-title-line]").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.hidden) node.dataset.seoWasHidden = "true";
        node.hidden = false;
      });
    }

    function restoreTitleLineEditPlaceholders() {
      document.querySelectorAll("[data-role-title-line]").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        node.hidden = !node.textContent.trim();
        delete node.dataset.seoWasHidden;
      });
    }

    function clearEditableMarkers() {
      document.querySelectorAll("[data-seo-editable]").forEach((node) => {
        node.removeAttribute("contenteditable");
        node.removeAttribute("spellcheck");
        node.removeAttribute("data-seo-editable");
        node.classList.remove("seo-edit-target");
      });
    }

    function isEditableEmpty(node) {
      return !node.textContent.replaceAll(emptyEditableAnchor, "").trim() && !Array.from(node.children).some((child) => !child.matches("br, wbr"));
    }

    function ensureEditableCaretAnchor(editable) {
      if (!(editable instanceof HTMLElement) || !isEditableEmpty(editable)) return;
      if (editable.querySelector("br, wbr")) editable.replaceChildren();
      if (!editable.textContent.includes(emptyEditableAnchor)) editable.appendChild(document.createTextNode(emptyEditableAnchor));
      editable.dataset.seoEmptyAnchor = "true";
    }

    function removeEditableCaretAnchors(root) {
      const target = root || document;
      target.querySelectorAll("[data-seo-empty-anchor]").forEach((node) => node.removeAttribute("data-seo-empty-anchor"));
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        walker.currentNode.textContent = walker.currentNode.textContent.replaceAll(emptyEditableAnchor, "");
      }
    }

    function applyEditableMarkers() {
      if (!enabled) return;
      collectEditableElements();
      const nextEditableSet = new Set(editableElements);
      document.querySelectorAll("[data-seo-editable]").forEach((node) => {
        if (nextEditableSet.has(node)) return;
        node.removeAttribute("contenteditable");
        node.removeAttribute("spellcheck");
        node.removeAttribute("data-seo-editable");
        node.classList.remove("seo-edit-target");
      });
      editableElements.forEach((node) => {
        node.setAttribute("contenteditable", "true");
        node.setAttribute("spellcheck", "true");
        node.setAttribute("data-seo-editable", "true");
        node.classList.add("seo-edit-target");
        ensureEditableCaretAnchor(node);
      });
    }

    function scheduleEditableRefresh() {
      if (!enabled) return;
      clearTimeout(editableRefreshTimer);
      editableRefreshTimer = setTimeout(applyEditableMarkers, 40);
    }

    function shouldRefreshForMutation(mutation) {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.some((node) => {
        const element = node instanceof Element ? node : node.parentElement;
        return element && !element.closest(".seo-toolbar, .seo-drag-handle");
      });
    }

    function status(text, isError = false) {
      const node = document.querySelector("[data-seo-status]");
      if (!node) return;
      node.textContent = text;
      node.classList.toggle("is-error", isError);
    }

    function targetFromSelector(selector) {
      if (!selector || !selector.startsWith("#")) return null;
      return document.getElementById(decodeURIComponent(selector.slice(1)));
    }

    function blockForControl(control) {
      const selector = control?.getAttribute("data-edit-control-for") || control?.getAttribute("href");
      const block = targetFromSelector(selector);
      return block?.parentElement ? block : null;
    }

    function ensureControlMap() {
      if (!config.autoMapAnchors) return;
      document.querySelectorAll(config.controlSelector).forEach((control) => {
        if (!(control instanceof HTMLElement) || control.closest(".seo-toolbar")) return;
        if (blockForControl(control)) control.setAttribute("data-seo-sortable", "control");
      });
    }

    function ensureSliceMap() {
      document.querySelectorAll(config.sliceContainerSelector).forEach((container, containerIndex) => {
        if (!(container instanceof HTMLElement) || container.closest(".seo-toolbar")) return;
        container.setAttribute("data-seo-slice-container", container.getAttribute("data-seo-slice-container") || `slice-${containerIndex}`);
        Array.from(container.querySelectorAll(`:scope > ${config.sliceItemSelector}`)).forEach((item, itemIndex) => {
          if (!(item instanceof HTMLElement)) return;
          item.setAttribute("data-seo-sortable", "slice");
          item.setAttribute("data-seo-slice-item", item.getAttribute("data-seo-slice-item") || `${containerIndex}-${itemIndex}`);
        });
      });
    }

    function sortableItem(target) {
      if (!(target instanceof Element)) return null;
      const item = target.closest("[data-seo-sortable]");
      if (!(item instanceof HTMLElement) || item.closest(".seo-toolbar")) return null;
      if (item.dataset.seoSortable === "control") return blockForControl(item) ? item : null;
      if (item.dataset.seoSortable === "slice") return item.parentElement?.hasAttribute("data-seo-slice-container") ? item : null;
      return null;
    }

    function pairedContent(item) {
      if (!item) return null;
      if (item.dataset.seoSortable === "control") return blockForControl(item);
      return item.dataset.seoSortable === "slice" ? item : null;
    }

    function dragHandle(target) {
      return target instanceof Element ? target.closest(".seo-drag-handle") : null;
    }

    function allowedDragItem(target) {
      const item = sortableItem(target);
      if (!item) return null;
      if (dragHandle(target)) return item;
      return armedDragItem === item ? item : null;
    }

    function editableTarget(event) {
      const target = event.target instanceof Element ? event.target.closest("[data-seo-editable]") : null;
      return validatedEditableTarget(target);
    }

    function validatedEditableTarget(target) {
      if (!target || target.closest(".seo-toolbar")) return null;
      return target;
    }

    function editableFromNode(node) {
      if (!node) return null;
      const element = node instanceof Element ? node : node.parentElement;
      return element ? validatedEditableTarget(element.closest("[data-seo-editable]")) : null;
    }

    function selectionEditableTarget() {
      const selection = getSelection();
      if (!selection || !selection.rangeCount) return null;
      return editableFromNode(selection.anchorNode) || editableFromNode(selection.focusNode);
    }

    function activeEditableTarget(event) {
      return editableTarget(event) || editableFromNode(document.activeElement) || selectionEditableTarget();
    }

    function hasTextSelectionInside(editable) {
      const selection = getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return false;
      return editable.contains(selection.anchorNode) && editable.contains(selection.focusNode) && String(selection).length > 0;
    }

    function interactiveTarget(event) {
      if (!(event.target instanceof Element)) return null;
      if (event.target.closest(".seo-toolbar, .seo-drag-handle")) return null;
      return event.target.closest(config.interactiveSelector);
    }

    function lock(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function insertTextAtSelection(editable, text) {
      ensureEditableCaretAnchor(editable);
      editable.focus({ preventScroll: true });
      const selection = getSelection();
      if (!selection) return false;
      let range = selection.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || !editable.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      return true;
    }

    function insertLineBreakAtSelection(editable) {
      ensureEditableCaretAnchor(editable);
      editable.focus({ preventScroll: true });
      const selection = getSelection();
      if (!selection) return false;
      let range = selection.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || !editable.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      range.deleteContents();
      const br = document.createElement("br");
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertLineBreak", data: null }));
      return true;
    }

    function flattenEditorBlockWrappers(root) {
      root.querySelectorAll("[data-seo-editable] div, [data-seo-editable] p").forEach((block) => {
        if (!block.parentElement?.closest("[data-seo-editable]")) return;
        const fragment = document.createDocumentFragment();
        if (block.previousSibling) fragment.appendChild(document.createElement("br"));
        while (block.firstChild) fragment.appendChild(block.firstChild);
        block.replaceWith(fragment);
      });
    }

    function normalizeEditorWhitespace(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        walker.currentNode.textContent = walker.currentNode.textContent.replaceAll("\u00a0", " ").replaceAll(emptyEditableAnchor, "");
      }
    }

    function plainTextFromPaste(event) {
      const text = event.clipboardData?.getData("text/plain") || "";
      return text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
    }

    function caretRangeFromPoint(x, y) {
      if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
      if (!document.caretPositionFromPoint) return null;
      const position = document.caretPositionFromPoint(x, y);
      if (!position) return null;
      const range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      return range;
    }

    function placeCaret(editable, event) {
      ensureEditableCaretAnchor(editable);
      editable.focus({ preventScroll: true });
      const selection = getSelection();
      if (!selection) return;
      let range = Number.isFinite(event.clientX) && Number.isFinite(event.clientY) ? caretRangeFromPoint(event.clientX, event.clientY) : null;
      if (!range || !editable.contains(range.startContainer)) {
        range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function addHandles() {
      document.querySelectorAll("[data-seo-sortable]").forEach((item) => {
        if (!(item instanceof HTMLElement)) return;
        if (!sortableItem(item)) return;
        let handle = item.querySelector(":scope > .seo-drag-handle");
        if (!handle) {
          handle = document.createElement("span");
          handle.className = "seo-drag-handle";
          handle.textContent = "↕";
          handle.setAttribute("contenteditable", "false");
          handle.setAttribute("draggable", "true");
          item.prepend(handle);
        }
        item.setAttribute("draggable", "true");
      });
    }

    function removeEditMarkers() {
      clearTimeout(editableRefreshTimer);
      clearEditableMarkers();
      restoreTitleLineEditPlaceholders();
      document.querySelectorAll(".seo-drag-handle").forEach((node) => node.remove());
      document.querySelectorAll("[data-seo-sortable]").forEach((node) => {
        node.removeAttribute("draggable");
        node.classList.remove("seo-is-dragging", "seo-drop-before", "seo-drop-after");
      });
    }

    function setMode(nextEnabled) {
      enabled = nextEnabled;
      document.body.classList.toggle("seo-edit-mode", enabled);
      const toggle = document.querySelector("[data-seo-toggle]");
      if (toggle) toggle.textContent = enabled ? "Завершить" : "Редактировать";
      removeEditMarkers();
      if (!enabled) {
        status("Режим редактирования выключен");
        return;
      }
      ensureControlMap();
      ensureSliceMap();
      showTitleLineEditPlaceholders();
      addHandles();
      applyEditableMarkers();
      status("Нажмите на текст или перетащите маркер");
    }

    function moveItem(dragged, target, after) {
      if (!dragged || !target || dragged === target) return false;
      const draggedContent = pairedContent(dragged);
      const targetContent = pairedContent(target);
      if (!draggedContent || !targetContent || draggedContent.parentElement !== targetContent.parentElement) return false;
      if (after) {
        target.after(dragged);
        if (draggedContent !== dragged) targetContent.after(draggedContent);
      } else {
        target.before(dragged);
        if (draggedContent !== dragged) targetContent.before(draggedContent);
      }
      status("Порядок изменён, сохраните страницу");
      return true;
    }

    function sanitizeClone(root) {
      const clone = root.cloneNode(true);
      clone.querySelectorAll(".seo-toolbar, .seo-drag-handle").forEach((node) => node.remove());
      flattenEditorBlockWrappers(clone);
      removeEditableCaretAnchors(clone);
      clone.querySelectorAll("[data-seo-editable], [contenteditable], [spellcheck], [data-seo-empty-anchor]").forEach((node) => {
        node.removeAttribute("contenteditable");
        node.removeAttribute("spellcheck");
        node.removeAttribute("data-seo-editable");
        node.removeAttribute("data-seo-empty-anchor");
        node.classList.remove("seo-edit-target");
      });
      clone.querySelectorAll("[data-seo-sortable], [data-seo-slice-container], [data-seo-slice-item]").forEach((node) => {
        node.removeAttribute("draggable");
        node.removeAttribute("data-seo-sortable");
        node.removeAttribute("data-seo-slice-container");
        node.removeAttribute("data-seo-slice-item");
        node.classList.remove("seo-is-dragging", "seo-drop-before", "seo-drop-after");
      });
      clone.querySelectorAll("[data-role-title-line]").forEach((node) => {
        node.hidden = !node.textContent.trim();
        node.removeAttribute("data-seo-was-hidden");
      });
      clone.classList?.remove("seo-edit-mode");
      normalizeEditorWhitespace(clone);
      return clone;
    }

    function buildPayload() {
      const roots = Array.from(document.querySelectorAll("header, main, footer")).filter((root) => root instanceof HTMLElement);
      return {
        url: location.href,
        title: document.title,
        roots: roots.map((root) => ({
          selector: root.tagName.toLowerCase() + (root.id ? `#${root.id}` : root.className ? `.${String(root.className).trim().split(/\s+/).join(".")}` : ""),
          html: sanitizeClone(root).outerHTML,
        })),
      };
    }

    function saveEndpoints() {
      const endpoints = [];
      const add = (endpoint) => {
        if (!endpoint || endpoints.includes(endpoint)) return;
        endpoints.push(endpoint);
      };
      if (Array.isArray(config.saveEndpointCandidates)) {
        config.saveEndpointCandidates.forEach(add);
      }
      if (location.origin && location.origin !== "null") {
        add(new URL(config.saveEndpoint, location.origin).href);
      } else {
        add(config.saveEndpoint);
      }
      return endpoints;
    }

    async function postSavePayload(payload) {
      let lastError = null;
      for (const endpoint of saveEndpoints()) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response;
        } catch (error) {
          lastError = new Error(`${endpoint}: ${error.message}`);
        }
      }
      throw lastError || new Error("save request failed");
    }

    async function save() {
      if (saving) return;
      saving = true;
      status("Сохраняем…");
      try {
        const payload = buildPayload();
        if (typeof config.save === "function") {
          await config.save(payload);
        } else {
          await postSavePayload(payload);
        }
        status("Сохранено");
      } catch (error) {
        status(`Не сохранено: ${error.message}`, true);
      } finally {
        saving = false;
      }
    }

    function mountToolbar() {
      if (!config.toolbar || document.querySelector(".seo-toolbar")) return;
      const toolbar = document.createElement("div");
      toolbar.className = "seo-toolbar";
      toolbar.innerHTML = '<button type="button" data-seo-toggle>Редактировать</button><button type="button" data-seo-save>Сохранить</button><span data-seo-status>Нажмите «Редактировать», затем кликните по тексту</span>';
      document.body.appendChild(toolbar);
      toolbar.querySelector("[data-seo-toggle]")?.addEventListener("click", () => setMode(!enabled));
      toolbar.querySelector("[data-seo-save]")?.addEventListener("click", save);
    }

    document.addEventListener("pointerdown", (event) => {
      if (!enabled) return;
      const handle = dragHandle(event.target);
      if (handle) {
        armedDragItem = sortableItem(handle);
        return;
      }
      const editable = editableTarget(event);
      const interactive = interactiveTarget(event);
      if (!editable && !interactive) return;
      if (editable) {
        event.stopImmediatePropagation();
        return;
      }
      lock(event);
    }, true);

    document.addEventListener("pointerup", (event) => {
      if (!enabled) return;
      const editable = editableTarget(event);
      if (!editable) return;
      event.stopImmediatePropagation();
      const caretEvent = { clientX: event.clientX, clientY: event.clientY };
      setTimeout(() => {
        if (enabled && !hasTextSelectionInside(editable)) placeCaret(editable, caretEvent);
      }, 0);
    }, true);

    document.addEventListener("click", (event) => {
      if (!enabled) return;
      if (dragHandle(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const editable = editableTarget(event);
      if (editable) {
        lock(event);
        return;
      }
      if (interactiveTarget(event)) lock(event);
    }, true);

    document.addEventListener("keydown", (event) => {
      if (!enabled) return;
      const editable = activeEditableTarget(event);
      if (!editable) return;
      const plainSpace = (event.key === " " || event.code === "Space") && !event.altKey && !event.ctrlKey && !event.metaKey;
      if (plainSpace) {
        lock(event);
        insertTextAtSelection(editable, visibleEditorSpace);
        status("Текст изменён, сохраните страницу");
        return;
      }
      const plainEnter = event.key === "Enter" && !event.altKey && !event.ctrlKey && !event.metaKey;
      if (plainEnter) {
        lock(event);
        insertLineBreakAtSelection(editable);
        status("Текст изменён, сохраните страницу");
        return;
      }
      event.stopPropagation();
    }, true);

    document.addEventListener("paste", (event) => {
      if (!enabled) return;
      const editable = activeEditableTarget(event);
      if (!editable) return;
      const text = plainTextFromPaste(event);
      lock(event);
      if (!text) return;
      insertTextAtSelection(editable, text);
      status("Текст изменён, сохраните страницу");
    }, true);

    document.addEventListener("input", (event) => {
      if (enabled && editableTarget(event)) status("Текст изменён, сохраните страницу");
    }, true);

    document.addEventListener("dragstart", (event) => {
      if (!enabled) return;
      const item = allowedDragItem(event.target);
      if (!item) {
        if (editableTarget(event) || interactiveTarget(event)) lock(event);
        return;
      }
      draggedItem = item;
      item.classList.add("seo-is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.getAttribute("href") || item.dataset.editControlFor || item.dataset.seoSliceItem || "");
      }
    }, true);

    document.addEventListener("dragover", (event) => {
      if (!enabled || !draggedItem) return;
      const target = sortableItem(event.target);
      if (!target || target === draggedItem || target.dataset.seoSortable !== draggedItem.dataset.seoSortable) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      const rect = target.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      document.querySelectorAll(".seo-drop-before, .seo-drop-after").forEach((node) => node.classList.remove("seo-drop-before", "seo-drop-after"));
      target.classList.toggle("seo-drop-before", !after);
      target.classList.toggle("seo-drop-after", after);
    });

    document.addEventListener("drop", (event) => {
      if (!enabled || !draggedItem) return;
      const target = sortableItem(event.target);
      if (!target || target === draggedItem || target.dataset.seoSortable !== draggedItem.dataset.seoSortable) return;
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      moveItem(draggedItem, target, event.clientY > rect.top + rect.height / 2);
      draggedItem = null;
      armedDragItem = null;
      document.querySelectorAll(".seo-drop-before, .seo-drop-after").forEach((node) => node.classList.remove("seo-drop-before", "seo-drop-after"));
    });

    document.addEventListener("dragend", () => {
      draggedItem?.classList.remove("seo-is-dragging");
      draggedItem = null;
      armedDragItem = null;
      document.querySelectorAll(".seo-drop-before, .seo-drop-after").forEach((node) => node.classList.remove("seo-drop-before", "seo-drop-after"));
    });

    new MutationObserver((mutations) => {
      if (!enabled) return;
      if (mutations.some(shouldRefreshForMutation)) scheduleEditableRefresh();
    }).observe(document.body, { childList: true, subtree: true });

    mountToolbar();
    ensureControlMap();
    ensureSliceMap();

    return { setMode, save, buildPayload, refresh: () => { ensureControlMap(); ensureSliceMap(); if (enabled) setMode(true); } };
  }

  window.SiteEditOverlay = { install };

  if (window.SiteEditOverlayAutoConfig !== false) {
    const boot = () => install(window.SiteEditOverlayAutoConfig || {});
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
  }
})();
