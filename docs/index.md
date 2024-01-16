# Automata Documentation

## Project Directory Structure

The following directory structure is just a suggestion and can be adjusted to the needs of each project.

```
├── app
│   ├── public
│   │   ├── css
│   │   │   ├── styles.css
│   │   ├── js
│   │   │   ├── script.js
│   │   ├── templates
│   │   │   ├── tpl-example.html
│   │   ├── tasks.json
└── server.bin
```

## Tasks

Tasks are a set of properties that can be applied to each HTML element by adding the "data-tasks" attribute. Properties are specified in a JSON file with ".json" extension. The default file name is tasks.json.

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
        "collect-data": "#contacts-list > table > tbody > tr > td > input[name]",
        "trigger": "click"
    }
}
```
Description of each of the properties that can be used in tasks.

- **action**: the action that is executed on the server when the event is triggered;
- **attribute-action**: replaces the "action" property with the specified attribute, which should be present on the element with the 'data-tasks' attribute. This property overrides the default and allows actions to be unique.
	Example: default action "/action/edit" and unique "/action/\<id\>/edit" for the element;
- **method**: set a request method (GET, POST, PUT, PATCH or DELETE) to indicate the desired action to be performed for a given resource;
- **attribute-method**: replaces the "method" property with the specified attribute, which should be present on the element with the 'data-tasks' attribute. This property override the default "method";
- **trigger**: specifies the event that triggers the request;
- **attribute-trigger**: replaces the "trigger" property with the specified attribute, which should be present on the element with the 'data-tasks' attribute. This property override the default "trigger";
- **collect-data**: uses the data attributes given by the first element within the document that matches the specified selector as a source of data;
- **file-path**: Used to load JSON data directly from a file to apply to templates. It only works if the action and method are not specified. It is ideal for creating dynamic content on static websites;

The following properties can be used both client-side and server-side via custom HTTP header:

- **target**: uses the first document element that matches the specified CSS selector as the final destination for data association with the template;
- **template**: this property enables you to choose the template for use to associate the data. If the name starts with the character "#", it indicates that the template is embedded in the destination page and corresponds to the "id" of the element to be utilized. Conversely, if it starts with "@", it signifies that it is a template to be loaded from the templates directory;
- **remove**: uses a list of document elements matching the specified group of CSS selectors to be removed before inserting the template into the destination.
- **swap**: this property controls how content is swapped into the target element. The following "swaps" are available:
    - <ins>inner</ins>: replaces the target with a specified new set of children (default);
    - <ins>outer</ins>: replaces the target in the children list of its parent with a set of node or string objects;
    - <ins>before</ins>: inserts a set of node or string objects in the children list of target's parent, just before the target;
    - <ins>after</ins>: inserts a set of node or string objects in the children list of the target's parent, just after the target;
    - <ins>prepend</ins>: inserts a set of node objects or string objects before the first child of the target element;
    - <ins>append</ins>: inserts a set of node objects or string objects after the target element;
    - <ins>delete</ins>: removes the target element from the DOM;
    - <ins>none</ins>: it exists only for convenience, but does not make any transformations.

### Special HTTP Header Automata-Transformation

Custom HTTP header (Automata-Transformation) containing information about the transformation to be applied and overrides the same default properties if indicated in the tasks file.

An example is provided below.

```http
HTTP/1.1 200 OK
Automata-Transformation: target:#contacts-list;template:#contacts-list-tpl;swap:innerHTML
Content-Type: application/json
```

## Templates

### Embedded

Embedded templates should have a unique id property, and their content must be enclosed within a "textarea" element with the "data-codeblock" attribute.

```html
<template id="contacts-list-tpl">
    <textarea data-codeblock>
      <!-- HTML Content -->  
    </textarea>
</template>
```

### Loaded

These templates reside in the templates directory and are loaded using the "template" property on tasks. The property must begin with the character @ followed by the name of the HTML file that contains the template.

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
