#!/usr/bin/env bash
# hls_stream_timer.sh

# This script is a daylight-aware camera stream manager.
#
# 1. Solar Scheduling:
#    - Calculates Sunrise/Sunset for La Jolla, CA.
#    - Active window: 10 mins before sunrise to 20 mins after sunset.
#    - Sleeps at night to save resources.
#
# 2. Stream Transcoding:
#    - Launches ffmpeg processes for two RTSP cameras (CAM1 & CAM2).
#    - Converts RTSP streams to HLS format (.m3u8 & .ts) for web viewing.
#
# 3. Self-Healing & Monitoring:
#    - Checks stream health every 60 seconds.
#    - Automatically restarts crashed streams.
#
# 4. Remote Integration:
#    - Calls "Wake" API on startup and "Sleep" API on shutdown.

# this is not needed rn because the script is only started once from AtReboot cron job,
# check for other running instances of this script and exit if found.
if pgrep -f "$0" | grep -v $$ | grep -q .; then
  echo "[ERROR][$(date +'%m/%d %H:%M:%S')] Another instance is already running; exiting"
  exit 1
fi


#### CONFIGURATION ####
LAT="32.8328"
LON="-117.2713"
# RTSP URLs in single quotes to preserve '&'
# Using Cloudflare's serverless platform to relay wake/sleep commands due to hairpin NAT issues.
WAKE='https://gliderport.stephen-c19.workers.dev/gpapi/wakeUp'
SLEEP='https://gliderport.stephen-c19.workers.dev/gpapi/gotoSleep'
CAM1_RTSP='rtsp://admin:qwe123@104.36.31.118:555/cam/realmonitor?channel=1&subtype=1'
CAM2_RTSP='rtsp://admin:qwe123@104.36.31.118:554/cam/realmonitor?channel=1&subtype=1'
OUT_BASE="/media/cmosdsnr/passport/gliderport/stream"
LOG_DIR="/home/cmosdsnr/log"

# HLS parameters
HLS_TIME=4
HLS_LIST_SIZE=10

# Ensure output and log dirs exist
mkdir -p "$OUT_BASE/camera1" "$OUT_BASE/camera2" "$LOG_DIR"

###########################################

# Fetch sunrise/sunset for a given date (YYYY-MM-DD).
get_sun_times() {
  local date_str=${1:-$(date +%F)}
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] Fetching sun times for $date_str..."
  local resp
  resp=$(curl -s "https://api.sunrise-sunset.org/json?lat=${LAT}&lng=${LON}&date=${date_str}&formatted=0")
  SR=$(date -d "$(echo "$resp" | jq -r .results.sunrise)" +%s)
  SS=$(date -d "$(echo "$resp" | jq -r .results.sunset)" +%s)
}

# Start ffmpeg HLS for a camera
start_stream() {
  local cam=$1 rtsp=$2 outdir=$3 logf=$4 pid_var=PID_${cam}
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] Starting $cam HLS pipeline"
  nohup ffmpeg -rtsp_transport tcp \
    -i "$rtsp" \
    -c:v copy -c:a copy \
    -f hls \
      -hls_time $HLS_TIME \
      -hls_list_size $HLS_LIST_SIZE \
      -hls_flags delete_segments+append_list \
      -hls_segment_filename "$outdir/segment_%03d.ts" \
    "$outdir/index.m3u8" \
    > "$logf" 2>&1 &
  eval "$pid_var=$!"
}

# Stop ffmpeg for a camera by matching its RTSP URL
stop_stream() {
  local cam=$1 url=$2
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] Stopping $cam streams matching URL $url"

  # Find any ffmpeg PIDs whose command line contains the exact URL, then kill them
  pids=$(ps aux \
    | grep '[f]fmpeg' \
    | grep -F "$url" \
    | awk '{print $2}')

  if [ -n "$pids" ]; then
    echo "[INFO][$(date +'%m/%d %H:%M:%S')] Found PIDs for $cam: $pids"
    kill $pids
    rm -f "$OUT_BASE/$cam"/*
  else
    echo "[INFO][$(date +'%m/%d %H:%M:%S')] No running ffmpeg for $cam to stop"
  fi
}

#######################
#      MAIN LOOP      #
#######################

while true; do
  # Cleanup any stray ffmpeg from old runs
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] Cleaning up leftover ffmpeg processes"
  stop_stream camera1 "$CAM1_RTSP"
  stop_stream camera2 "$CAM2_RTSP"

  # Compute today's window
  get_sun_times
  start_window=$((SR - 10*60))    # 10m before sunrise
  end_window=$((SS + 20*60))      # 20m after sunset
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] Window: $(date -d @$start_window) to $(date -d @$end_window)"

  # Sleep until window opens
  now=$(date +%s)
  if (( now < start_window )); then
    echo "[INFO][$(date +'%m/%d %H:%M:%S')] Sleeping $((start_window - now))s until window opens"
    sleep $((start_window - now))
  fi

  # Launch streams
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] Launching streams"
  start_stream camera1 "$CAM1_RTSP" "$OUT_BASE/camera1" "$LOG_DIR/ffmpeg_camera1.log"
  start_stream camera2 "$CAM2_RTSP" "$OUT_BASE/camera2" "$LOG_DIR/ffmpeg_camera2.log"
  sleep 120  # allow startup
  nohup wget -q -O /dev/null "$WAKE" >/dev/null 2>&1 &
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] WakeUp sent to server (gliderport.thilenius.com)"

  # Monitor & restart
  while (( $(date +%s) <= end_window )); do
    # Monitor Camera 1 (Restart if process missing OR file older than 30s)
    AGE1=$(( $(date +%s) - $(stat -c %Y "$OUT_BASE/camera1/index.m3u8" 2>/dev/null || echo 0) ))
    if ! ps aux | grep ffmpeg | grep -F "$CAM1_RTSP" >/dev/null || [ $AGE1 -gt 30 ]; then
      REASON="process missing"
      [ $AGE1 -gt 30 ] && REASON="output stale (${AGE1}s > 30s)"
      echo "[WARN][$(date +'%m/%d %H:%M:%S')] camera1 $REASON, restarting"
      stop_stream camera1 "$CAM1_RTSP"
      start_stream camera1 "$CAM1_RTSP" "$OUT_BASE/camera1" "$LOG_DIR/ffmpeg_camera1.log"
    fi
    
    # Monitor Camera 2
    AGE2=$(( $(date +%s) - $(stat -c %Y "$OUT_BASE/camera2/index.m3u8" 2>/dev/null || echo 0) ))
    if ! ps aux | grep ffmpeg | grep -F "$CAM2_RTSP" >/dev/null || [ $AGE2 -gt 30 ]; then
      REASON="process missing"
      [ $AGE2 -gt 30 ] && REASON="output stale (${AGE2}s > 30s)"
      echo "[WARN][$(date +'%m/%d %H:%M:%S')] camera2 $REASON, restarting"
      stop_stream camera2 "$CAM2_RTSP"
      start_stream camera2 "$CAM2_RTSP" "$OUT_BASE/camera2" "$LOG_DIR/ffmpeg_camera2.log"
    fi

    sleep 60
  done

  # Stop streams
  echo "[INFO][$(date +'%m/%d %H:%M:%S')] Window ended, stopping streams"
  stop_stream camera1 "$CAM1_RTSP"
  stop_stream camera2 "$CAM2_RTSP"

  # Call the sleep API and verify the JSON response:
  resp=$(curl -s "$SLEEP")
  if [[ "$resp" == *'"status":"going to sleep"'* ]]; then
    echo "[INFO][$(date +'%m/%d %H:%M:%S')] Sleep API succeeded: $resp" 
  else
    echo "[ERROR][$(date +'%m/%d %H:%M:%S')] Sleep API failed: $resp" 
  fi

  # Compute next window and sleep
  get_sun_times "$(date -d 'tomorrow' +%F)"
  start_window=$((SR - 10*60))
  # end_window unused here
  now=$(date +%s)
  
  # ⚠️ Warn if we’re already past the next start
  if (( now >= start_window )); then
     echo "[WARN][$(date +'%m/%d %H:%M:%S')] now ($now) is ≥ start_window ($start_window)"
  fi

  if (( now < start_window )); then
    sleep_secs=$((start_window - now))
    echo "[INFO][$(date +'%m/%d %H:%M:%S')] Sleeping $sleep_secs s until next window at $(date -d @$start_window)"
    sleep $sleep_secs
  fi
done

