#!/usr/bin/env bash
# Dispatch beta-launch work packages to the Antigravity CLI in parallel.
# Usage: scripts/agy-dispatch.sh A B C D E      (then later: scripts/agy-dispatch.sh F, then G)
# Reports land in .agy-reports/report-<PKG>.md; the working tree is left uncommitted for review.
#
# --dangerously-skip-permissions is deliberate: print mode cannot answer prompts, so an
# unattended run must pre-approve its own tool calls. You launch this script by hand, and
# that is the consent. Set AGY_SANDBOX=1 to add the CLI's own terminal sandbox on top.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .agy-reports
TEMPLATE=docs/superpowers/plans/agy-package-prompt.md
TEMPLATE_TEXT="$(<"$TEMPLATE")"
MODEL="${AGY_MODEL:-gemini-3.8-flash-high}"
EXTRA=()
[[ "${AGY_SANDBOX:-0}" == "1" ]] && EXTRA+=(--sandbox)

for PKG in "$@"; do
  [[ "$PKG" =~ ^[A-G]$ ]] || { echo "package must be a single letter A-G, got: $PKG" >&2; exit 2; }
  PROMPT="${TEMPLATE_TEXT//__PKG__/$PKG}"
  (
    timeout 2700 agy -p "$PROMPT" --model "$MODEL" --dangerously-skip-permissions "${EXTRA[@]}" \
      --print-timeout 45m --output-format text \
      > ".agy-reports/report-$PKG.md" 2> ".agy-reports/err-$PKG.log"
    echo "EXIT=$?" >> ".agy-reports/report-$PKG.md"
  ) &
  echo "launched package $PKG (pid $!)"
done
wait
echo "all packages finished; reports in .agy-reports/"
