#!/system/bin/sh
# Write to file in background, no stdout to avoid Manager pipe issues
(
  echo "Ksape v0.1.0"
  echo "Kernel: $(uname -r)"
  echo "Load: $(cat /proc/loadavg)"
  echo "Procs: $(ls -d /proc/[0-9]* 2>/dev/null | wc -l)"
) > /data/local/tmp/ksape_action.log 2>&1 &
