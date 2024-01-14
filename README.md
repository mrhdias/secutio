# Automata
⚠️ WARNING: This framework is still in heavy development. ⚠️

Makes the difficult parts easy. It's like htmx but different!

You can implement the backend in any programming language since the framework is programming language agnostic.

## Quick Start
Create an html file and add the library.
```html
<!doctype html>
<html lang="en">
<head>
  <title>Test</title>
</head>
<body>
  <button data-tasks="click-me">Click Me</button>
  <script>
    import("https://cdn.jsdelivr.net/gh/mrhdias/automata@master/dist/js/automata.min.js").then((module) => {
      // Do something with the module.
      const automata = new module.Automata();
      automata.init();
    });
  </script>
</body>
</html>
```
Create a file with the tasks in the directory where the HTML file is located.

tasks.json
```json
{
  "click-me": {
    "action": "/clicked",
    "method": "post",
    "attribute-trigger": "data-task-trigger",
    "trigger": "click",
    "swap": "outer"
  }
}
```

