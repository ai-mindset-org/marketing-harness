# shared by open.sh and demo.sh: pick a port for the harness server.
#   harness_port <dir>   → "reuse <port>" when a harness server already serves <dir> (any of 13 ports),
#                          otherwise "new <port>" with the first free port from $PORT (4747) up.
harness_port() {
  local want="$1" start="${PORT:-4747}" p served free=""
  for p in $(seq "$start" $((start + 12))); do
    if ! lsof -ti tcp:"$p" -sTCP:LISTEN >/dev/null 2>&1; then [[ -n "$free" ]] || free="$p"; continue; fi
    served="$(node -e 'fetch(process.argv[1]).then(r=>r.json()).then(j=>console.log(j.dir||"")).catch(()=>console.log(""))' "http://localhost:$p/api/session" 2>/dev/null)"
    if [[ -n "$served" && "$served" == "$want" ]]; then echo "reuse $p"; return; fi
  done
  [[ -n "$free" ]] && echo "new $free" || echo "none 0"
}
