// (function (xhr) {

//     var XHR = XMLHttpRequest.prototype;

//     var open = XHR.open;
//     var send = XHR.send;

//     XHR.open = function (method, url) {
//         this._method = method;
//         this._url = url;
//         return open.apply(this, arguments);
//     };

//     XHR.send = function (postData) {
//         console.log('injected script xhr request:', this._method, this._url, this.getAllResponseHeaders(), postData);
//         this.addEventListener('load', function () {
//             window.postMessage({ type: 'xhr', data: this.response }, '*');  // send to content script
//         });
//         return send.apply(this, arguments);
//     };
// })(XMLHttpRequest);



const { fetch: origFetch } = window;
window.fetch = async (...args) => {
    const response = await origFetch(...args);
    const url = response.url
    if (url.includes("loadLessonForStudent"))
        response
            .clone()
            .json() // maybe json(), text(), blob()
            .then(body => {
                window.postMessage({ type: 'loadLessonForStudenResponse', body }, '*'); // send to content script
            })
            .catch(err => console.error(err));
    return response;
};

console.log("sending", window.location.href)
window.postMessage({ type: "url", url: window.location.href })

setInterval(() => {
    let question = document.querySelectorAll("div[class*=uu-coursekit-question-t]")?.[1]?.children?.[1]?.textContent
    if (!question) return

    const isMultiPlaceholder = /Odpověď \d+. z \d+/.test(question)  
    if(isMultiPlaceholder) {
        question = document.querySelectorAll("div[class*=uu-coursekit-question-t]")?.[1]?.children?.[3]?.textContent
    }

    window.postMessage({ type: "question", question })
}, 1_000)
