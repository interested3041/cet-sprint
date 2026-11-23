#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT=${PORT:-8080} node server.js
