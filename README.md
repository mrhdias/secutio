# Secutio
> [!WARNING]
> This framework is still in heavy development.
> [Purge the cache](https://www.jsdelivr.com/tools/purge) to ensure the acquisition of the latest updated version.

The project's name was changed from "automata" to "secutio" due to the existence of other projects related to Finite State Machines already using the name "automata". "Secutio" is a Latin term that translates to "sequence" or "following." I believe "Secutio" is an excellent name for this project, as it specifically emphasizes the execution of tasks in a sequential order.

Makes the difficult parts easy. It's like htmx but different!

## Introduction
The objective of this project is to simplify the development of web applications (single-page applications) by reducing the inherent complexity.

This library facilitates the association of actions (referred to as tasks here) with any HTML element, much like the way we associate actions with form submissions. Templates, whether embedded in HTML (using the template element) or served from a directory, are also supported. The practical association of data with templates is achieved using [JavaScript Template Literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).

This library also enables you to modify only the target HTML elements specified in the "tasks" without needing to reload the entire page.

You can implement the backend in any programming language since the framework is programming language agnostic. A working example can be seen [here](examples/click-to-edit).

## Quick Start
Create an HTML file and include the library path at the end of the "body" tag. Define tasks to be performed using the "script" element and add the "data-tasktable" attribute. Also, include the "type" attribute, which must be set to "application/json". Tasks can alternatively be defined in a JSON file; both modes are supported simultaneously, similar to styles.

Example:
```html
<script data-tasktable type="application/json" src="tasks.json"></script>
```
Here is a working example that retrieves a joke and can be viewed on [CodePen](https://codepen.io/hdias/pen/mdoXPow):
```html
<!doctype html>
<html lang="en">
<head>
  <title>Test</title>
</head>
<body>
  <button data-tasks="get-joke">Click Me</button>
  <p id="output"></p>

  <script data-tasktable type="application/json">
    {
      "get-joke": {
        "action": "https://v2.jokeapi.dev/joke/Any?format=txt&safe-mode",
        "method": "get",
        "trigger": "click",
        "target": "#output",
        "swap": "inner"
      }
    }
  </script>

  <!-- If in a browser environment -->
  <script type="text/javascript" src="https://cdn.jsdelivr.net/gh/mrhdias/secutio@master/dist/js/secutio.min.js"></script>
  <script>
    const app = new Secutio();
    app.init();
  </script>

</body>
</html>
```
Here is an example of a JSON file (tasks.json) containing the tasks mentioned below in the HTML script tag:
```json
{
  "get-joke": {
    "action": "https://v2.jokeapi.dev/joke/Any?format=txt&safe-mode",
    "method": "get",
    "trigger": "click",
    "target": "#output",
    "swap": "inner"
  }
}
```
### Embedded Templates
Embedded templates should have a unique id property, and their content must be enclosed within the tag "template".
```html
<template id="contacts-list-tpl">
  <!-- HTML Content -->
</template>
```

