/* <![CDATA[ */

class Automata {
    constructor(parameters = {
        "attribute": "data-tasks",
        "json_file": "tasks.json"
    }) {
        // https://developer.mozilla.org/en-US/docs/Web/API/Element#events
        // Some events to test
        this.triggers = new Set([
            'click',
            'mouseenter',
            'mouseover',
            'mouseup',
            'mouseleave'
        ]);
        this.dataAttribute = parameters["attribute"];
        this.jsonFile = parameters["json_file"];
        this.tasks = {};
    }

    async makeRequest(data = {}) {
        const response = await fetch(data.action, {
            method: data.method,
            cache: "no-cache"
        });

        const fragment = await response.text()
        return fragment;
    }

    async getDefinedTasks() {
        const response = await fetch(this.jsonFile, {
            cache: "no-cache"
        });

        this.tasks = await response.json();
    }

    setTask(element) {
        const elementTasks = element.dataset.tasks.split(/ +/);

        let _this = this;
        elementTasks.forEach(function (task) {
            if (_this.tasks.hasOwnProperty(task)) {
                // console.log("Task:", task);

                const parameters = _this.tasks[task];
                // the default trigger for Button is "click"
                if (!(parameters.hasOwnProperty('trigger') &&
                    _this.triggers.has(parameters.trigger)) &&
                    (element.nodeName === 'BUTTON' ||
                        (element.nodeName === 'INPUT' && element.type === 'button'))) {
                    parameters.trigger = 'click';
                }

                element.addEventListener(parameters.trigger, (event) => {
                    _this.makeRequest(parameters).then((data) => {
                        if (parameters.hasOwnProperty('target')) {
                            // console.log(data);
                            if (parameters.target === 'this') {
                                if (parameters.hasOwnProperty('swap') &&
                                    parameters.swap === 'outerHTML') {
                                    element.outerHTML = data;
                                } else {
                                    element.innerHTML = data;
                                }
                            } else {
                                if (parameters.hasOwnProperty('swap') &&
                                    parameters.swap === 'outerHTML') {
                                    document.querySelector(parameters.target).outerHTML = data;
                                } else {
                                    document.querySelector(parameters.target).innerHTML = data;
                                }
                            }
                        }
                    });
                }, false);
            }
        });
    }

    search4Tasks(parentNode) {

        const elemWithTasks = parentNode.querySelectorAll("[" + this.dataAttribute + "]");

        if (elemWithTasks.length > 0) {
            let _this = this;
            elemWithTasks.forEach(function (element, index) {
                // console.log(element.dataset.tasks);
                _this.setTask(element);
            });
        }
    }

    init() {

        // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

        const targetNode = document.getElementsByTagName('body');

        const config = {
            childList: true,
            subtree: true
        };

        const callback = (mutations, observer) => {
            mutations.forEach(mutation => {
                if (mutation.type === "childList") {
                    for (const addedNode of mutation.addedNodes) {
                        if (addedNode.childNodes.length > 0) {
                            // console.log(addedNode.parentNode.outerHTML);
                            this.search4Tasks(addedNode.parentNode);
                        }
                    }

                    for (const removedNode of mutation.removedNodes) {
                        if (removedNode.childNodes.length > 0 &&
                            removedNode.hasAttribute(this.dataAttribute)) {
                            console.log("Unimplemented removeEventListener...");
                        }
                    }

                    if (mutation.target.childNodes.length === 0) {
                        observer.disconnect();
                    }
                }
            });
        }

        const observer = new MutationObserver(callback);
        observer.observe(targetNode[0], config);

        this.getDefinedTasks().then(() => {
            this.search4Tasks(targetNode[0]);
        });
    }

}
// const automata = new Automata();
// automata.init();
/* ]]> */