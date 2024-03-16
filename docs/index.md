# Secutio Documentation

**Table of Contents:**
<!-- no toc -->
- [Example Usage](#example-usage)
- [Project Directory Structure](#project-directory-structure)
- [Tasks](#tasks)
  - [Properties](#properties)
  - [Custom Attributes](#custom-attributes)
  - [Special HTTP Header Secutio-Transformation](#special-http-header-secutio-transformation)
- [Subtasks](#subtasks)
  - [Properties](#properties-1)
- [Templates](#templates)
  - [Embedded](#embedded)
  - [Loaded](#loaded)
  - [Template Literals](#template-literals)
- [Todo List](#todo-list)

## Example Usage

If using Node.js or another CommonJS environment
```js
  const Secutio = require('./secutio');
  const app = new Secutio();
  app.init();
```

If in a browser environment
```html
  <script
    type="text/javascript"
    src="https://cdn.jsdelivr.net/gh/mrhdias/secutio@master/dist/js/secutio.min.js">
  </script>
  <script>
    const app = new Secutio();
    app.init();
  </script>
```

## Project Directory Structure

The following directory structure is just a suggestion and can be adjusted to the needs of each project.

```
├── app/
│   ├── public/
│   │   ├── css/
│   │   │   ├── styles.css
│   │   ├── js/
│   │   │   ├── script.js
│   │   ├── templates/
│   │   │   ├── tpl-example.html
│   │   ├── tasks.json
└── server.bin
```

## Tasks

Tasks are a set of properties that can be applied to each HTML element by adding the "data-tasks" attribute. Properties are specified in a JSON file with a ".json" extension. The JSON file is loaded from the path specified in "src" of "script" HTML element with the "data-tasktable" attribute and the "type" attribute must be set to "application/json". More than one task can be defined per element as long as they correspond to different events (click, mouseover, submit, etc).

Example of a tasks file.

```json
{
  "get-contacts-list": {
    "action": "/listcontacts",
    "method": "get",
    "trigger": "click"
  },
  "switch-contact-status": {
    "action": "/statuscontact",
    "method": "put",
    "function": "prepare-data",
    "trigger": "click"
  }
}
```
### Properties
The following properties can be used in the "data-tasks" attribute:
- **action**: The action that is executed on the server when the event is triggered;
- **method**: Set a request method (GET, POST, PUT, PATCH or DELETE) to indicate the desired action to be performed for a given resource;
- **trigger**: Specifies the event that triggers the request;
- **then**: List of subtasks with the CSS "selector" property to be executed after the trigger has been performed (useful for displaying loaders);
- **next**: Performs a new task within the context of the original event where the property was declared;
- **src-file**: Used to load JSON data directly from a file to apply to templates. It only works if the action and method are not specified. It is ideal for creating dynamic content on static websites;
- **disabled**: This property disable the task execution if set to "true";
- **error**: Sets a new task that replaces the original if an error occurs during the request.

The following properties can be used both client-side and server-side via custom HTTP header:
- **target**: Uses the first document element that matches the specified CSS selector as the final destination for data association with the template. The string "this" indicates that the target of the replacement is the element that triggered the action;
- **template**: This property enables you to choose the template for use to associate the data. If the name starts with the character "#", it indicates that the template is embedded in the destination page and corresponds to the "id" of the element to be utilized. Conversely, if it starts with "@", it signifies that it is a template to be loaded from the specified path (@path_to_resource) on the server;
- **before**: List of subtasks with the CSS "selector" property to be executed before swapping the new content at the target;
- **after**: List of subtasks with the CSS "selector" property to be executed after swapping the new content in the target;
- **swap**: This property controls how content is swapped into the target element. The following "swaps" are available:
  - <ins>inner</ins>: Replaces the target with a specified new set of children (default);
  - <ins>outer</ins>: Replaces the target in the children list of its parent with a set of node or string objects;
  - <ins>before</ins>: Inserts a set of node or string objects in the children list of target's parent, just before the target;
  - <ins>after</ins>: Inserts a set of node or string objects in the children list of the target's parent, just after the target;
  - <ins>prepend</ins>: Inserts a set of node objects or string objects before the first child of the target element;
  - <ins>append</ins>: Inserts a set of node objects or string objects after the target element;
  - <ins>delete</ins>: Removes the target element from the DOM;
  - <ins>clean</ins>: Remove all child nodes from target element;
  - <ins>none</ins>: It exists only for convenience, but does not make any transformations.

### Custom Attributes
Custom attributes can be added to the elements where "tasks" are specified, allowing one to override the default value of one property with another. The property in the "tasks" file that defines the attribute must always begin with the substring 'attribute-' followed by the attribute with property to replace. This transformation is available for the following properties: action, src-file, method, remove, target, swap, before, after, and trigger.

Example:

tasks.json
```json
{
  "load-paradises": {
    "action": "/listparadises",
    "attribute-action": "data-action",
    "method": "get",
    "trigger": "click",
    "target": "#paradises",
    "swap": "inner"
  }
}
```
The **attribute-action** replaces the "action" property with the specified attribute, which should be present on the element with the "data-tasks" attribute.
This property overrides the default and allows actions to be unique.

template
```html
<div id="paradises"></div>
<button data-tasks="load-paradises">List All</button>
<button data-tasks="load-paradises" data-action="/listparadises/earth">Go To Earth</button>
```

### Special HTTP Header Secutio-Transformation

Custom HTTP header (Secutio-Transformation) containing information about the transformation to be applied and overrides the same default properties if indicated in the tasks file.

An example is provided below.

```http
HTTP/1.1 200 OK
Secutio-Transformation: target:#contacts-list;template:#contacts-list-tpl;swap:innerHTML
Content-Type: application/json
```
## Subtasks

These special tasks are executed **before** or **after** the task with the event that triggered the action and must have the "selector" property.

Example of a subtask:

tasks.json
```json
{
  "active-paradise": {
    "selector": ".paradises > .earth",
    "add": {
      "class": "active",
      "style": "color: #0d6efd;"
    }
  }
}
```
### Properties

Description of each of the properties allowed in the subtasks:
- **selector**: Returns a list of elements that match the specified group of selectors. The "remove" and "add" properties are applied to this list of elements;
- **remove**: Uses the list of document elements that match the specified CSS "selector" to remove attributes or properties of them before/after inserting the content into the target. If the property is empty "{}", remove the element itself. If the "remove" and "add" property is present in the subtask, the first one to be executed is "remove".
  - <ins>attributes</ins>: List (array) of attributes to remove on each selected element;
  - <ins>class</ins>: String with class names separated by space;
  - <ins>style</ins>: String with property names separated by space;
- **add**: Uses the list of document elements that match the specified CSS "selector" to add attributes or modify them before/after inserting the content into the target.
  - <ins>attributes</ins>: Object with attributes in the form (attribute/value);
  - <ins>class</ins>: String with class names separated by space;
  - <ins>style</ins>: String in the form "property; value; property n; value;..."

In the "class" and "style" properties, which are already attributes, the value is a string and in the attributes it is a list in "remove" and an "object" in "add".

## Templates

These templates can be used to generate HTML content on the client side and can be embedded into the HTML page or loaded. This has nothing to do with the templating engines used on the server side to render pages before sending them to the client.

There is a special variable that can be used in templates:
- **data**: The data variable contains information obtained from an HTTP response or a JSON file when the "src-file" task property is provided.

### Embedded

Embedded templates should have a unique id property, and their content must be enclosed within the tag "template".

```html
<template id="contacts-list-tpl">
  <!-- HTML Content -->
</template>
```

### Loaded

These templates reside in the public directory like normal html files and are loaded using the "template" property on tasks. The property must begin with the character "@" followed by the path of the HTML file that contains the template.

templates/example.html
```html
<!-- HTML Content -->
```

### Template Literals

[Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals), formerly known as template strings. Template literals are enclosed with backtick ( &#96;) characters, enabling multi-line strings, string interpolation with embedded expressions, and special constructs known as tagged templates.

```javascript
let name = 'John Doe';
console.log(`Hello ${name}!`);
// returns Hello John Doe!
```
Template literals provide a concise and expressive way to create reusable components with HTML templates, simplifying variable insertion, supporting multiline strings, enabling expression evaluation, and enhancing overall code readability.

## Todo List

- [ ] In addition to the "add" and "remove" properties in subtasks, also add the "replace" property for attributes, classes and styles;
- [ ] Creates a property on tasks to store data locally on the client side;
- [ ] Add more examples;
- [ ] Add more information to documentation;
- [ ] Add custom HTML components.


