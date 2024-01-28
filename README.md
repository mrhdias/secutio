# Secutio
> [!WARNING]
> This framework is still in heavy development.

The project's name was changed from "automata" to "secutio" due to the existence of other projects related to Finite State Machines already using the name "automata". "Secutio" is a Latin term that translates to "sequence" or "following." I believe "Secutio" is an excellent name for this project, as it specifically emphasizes the execution of tasks in a sequential order.

Makes the difficult parts easy. It's like htmx but different!

## Introduction
The objective of this project is to simplify the development of web applications (single-page applications) by reducing the inherent complexity.

This library facilitates the association of actions (referred to as tasks here) with any HTML element, much like the way we associate actions with form submissions. Templates, whether embedded in HTML (using the template element) or served from a directory, are also supported. The practical association of data with templates is achieved using [JavaScript Template Literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).

This library also enables the modification of only the target elements specified in the tasks without the need to reload the entire page.

You can implement the backend in any programming language since the framework is programming language agnostic. A working example can be seen [here](examples/click-to-edit).

## Quick Start
Create an HTML file and add the library.
```html
<!doctype html>
<html lang="en">
<head>
  <title>Test</title>
</head>
<body>
  <button data-tasks="click-me">Click Me</button>
  <script>
    import("https://cdn.jsdelivr.net/gh/mrhdias/secutio@master/dist/js/secutio.min.js").then((module) => {
      // Do something with the module.
      const secutio = new module.Secutio();
      secutio.init();
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
    "trigger": "click",
    "swap": "outer"
  }
}
```
### Embedded Templates
Embedded templates should have a unique id property, and their content must be enclosed within a "textarea" element with the "data-codeblock" attribute.
```html
<template id="contacts-list-tpl">
    <textarea data-codeblock>
      <!-- HTML Content -->  
    </textarea>
</template>
```

