#!/bin/sh

FILES=$(find dist/js/ -type f ! -name '*.min.*')

for FILE in $FILES
do
    uglifyjs -m eval -o ${FILE%.*}.min.js $FILE
done
