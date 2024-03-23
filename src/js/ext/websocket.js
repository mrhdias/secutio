/*
    websocket.js - secutio extension
    Author: Henrique Dias
    Last Modification: 2024-03-22 19:11:57

    References:
    https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

    Usage:

    <script data-tasktable type="application/json">
    {
        "task-name-01": {
            "extension": {
                "name": "websocket",
                "connect": "ws://localhost:8080/test"
            },
            ...
        },
        "task-name-02": {
            "extension": {
                "name": "websocket",
                "connect": "ws://localhost:8080/echo",
                "callback": "send-data",
                "element": "#send-data",
                "trigger": "click"
            },
            ...
        }
    }
    </script>

    <script type="text/javascript" src="./secutio.js"></script>
    <script type="text/javascript" src="./ext/websocket.js"></script>
    <script>
        const app = new Secutio();
        app.init();

        app.extension_register('websocket', wsExtension);

        app.callback_register('send-data', ((socket) => {
            socket.send('Hello Server!');
        }));
    </script>
*/

const wsExtension = ((taskEvent, taskProperties) => {
    // Create WebSocket connection.

    const properties = taskProperties['extension'];

    if (properties['name'] !== 'websocket') {
        throw new Error('The extension name is not \"websocket\"!');
    }

    if (!properties.hasOwnProperty('connect')) {
        throw new Error(`The \"connect\" property is not defined for websocket extension!`);
    }

    if (properties.connect === '') {
        throw new Error('The \"connect\" property is empty in websocket extension!');
    }

    const socket = new WebSocket(properties.connect);

    const sendData = () => {
        if (properties.hasOwnProperty('callback')) {
            if (properties.callback === '') {
                throw new Error(`The websocket extension \"callback\" property is empty!`);
            }
            app.callbacks[properties.callback](socket);
        }
    };

    // Connection opened
    socket.addEventListener("open", async (e) => {
        // socket.send("Hello Server!");
        if (properties.hasOwnProperty('element')) {
            if (properties.element === '') {
                throw new Error(`The websocket extension \"element\" property is empty!`);
            }

            const element = document.querySelector(properties.element);
            if (element !== null) {
                if (properties.hasOwnProperty('trigger')) {
                    if (properties.trigger === '') {
                        throw new Error(`The websocket extension \"trigger\" property is empty!`);
                    }
                } else {
                    properties.trigger = 'click';
                }

                element.addEventListener(properties.trigger, sendData);
            }
        } else {
            sendData();
        }
    });

    // Listen for messages
    socket.addEventListener("message", async (e) => {
        // console.log('Event WebSocket:', e.data);
        taskEvent.result = e.data;
        delete (e.data);
        const helperFragment = await app.processReqData(taskEvent, taskProperties);
        await app.sequenceTasks(helperFragment, taskEvent, taskProperties);
    });
});