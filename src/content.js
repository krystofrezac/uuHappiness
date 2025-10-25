const injectScript = () => {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/injected.js");
  (document.head || document.documentElement).appendChild(script);
};

const sendIconUrl = () => {
  setInterval(() => {
    const iconUrl = chrome.runtime.getURL("src/assets/icon128.png");
    window.postMessage({ type: "iconUrl", iconUrl }, "*");
  }, 2_000);
};

const listenForMessages = () => {
  const handleSaveLesson = async (message) => {
    const { questionMap } = message;

    const savedQuestionMap = await chrome.storage.local
      .get(["questionMap"])
      .then((value) => value?.questionMap);

    chrome.storage.local.set({
      questionMap: { ...savedQuestionMap, ...questionMap },
    });
  };

  const handleGetQuestion = async (message) => {
    const { questionHash } = message;

    const questionMap = await chrome.storage.local
      .get(["questionMap"])
      .then((value) => value?.questionMap);

    if (!questionMap) {
      window.postMessage({
        type: "getQuestionResult",
        question: undefined,
      });
      return;
    }

    const foundQuestion = questionMap[questionHash];
    window.postMessage({
      type: "getQuestionResult",
      question: foundQuestion,
    });
  };

  const handlerMap = {
    saveLesson: handleSaveLesson,
    getQuestion: handleGetQuestion,
  };
  window.addEventListener("message", (messageEvent) => {
    handlerMap[messageEvent.data.type]?.(messageEvent.data);
  });
};

injectScript();
sendIconUrl();
listenForMessages();
