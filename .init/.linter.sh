#!/bin/bash
cd /home/kavia/workspace/code-generation/quickbook-tatkal-eb6738e8/tatkal_booking_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

