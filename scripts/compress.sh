#!/bin/sh

FILES=$(find dist/js/ -type f -name '*.min.js')

for FILE in $FILES
do
    gzip -9 -k -f $FILE > $FILE.gz
done
