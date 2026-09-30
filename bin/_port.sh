# shared by open.sh and demo.sh: pick a port for the harness server.
#   harness_port <dir>   → prints "reuse <port>" when a harness server already serves <dir>,
#                          otherwise "new <port>" with the first free port from $PORT (4747) up.
harness_port() {
  local want="$1" p="${PORT:-4747}" served
  for _ in $(seq 0 12); do
    if ! lsof -ti tcp:"$p" >/dev/null 2>&1; then echo "new $p"; return; fi
    served="$(node -e 'fetch(process.argv[1]).then(r=>r.json()).then(j=>console.log(j.dir||"")).catch(()=>console.log(""))' "http://localhost:$p/api/session" 2>/dev/null)"
    if [[ -n "$served" && "$served" == "$want" ]]; then echo "reuse $p"; return; fi
    p=$((p + 1))
  done
  echo "none 0"
}
