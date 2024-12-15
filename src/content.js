/** IT'S DUPLICATED IN injected.js */
const getQuestionHash = async (question) => {
  const hashSource = [
    JSON.stringify(question.task),
    JSON.stringify(question.answerList),
  ].toString();

  // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
  const msgUint8 = new TextEncoder().encode(hashSource);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

const getMaybeLocalizedValue = (maybeLocalized) => {
  if (typeof maybeLocalized === "string") return maybeLocalized;

  return maybeLocalized.cs;
};

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
    const { lesson } = message;

    const savedQuestionMap = await chrome.storage.local
      .get(["questionMap"])
      .then((value) => value?.questionMap);

    const answerFields = [
      "correctAnswerIndex",
      "pairList",
      "correctAnswerIndexList",
      "correctAnswerOrder",
      "tripletList",
    ];

    const questions = Object.values(lesson.questionMap);
    const questionsWithAnswers = questions.filter((question) =>
      answerFields.some((answerField) => {
        const fieldValue = question[answerField];
        return fieldValue !== undefined && fieldValue !== null;
      }),
    );
    const questsionsWithHash = await Promise.all(
      questionsWithAnswers.map(async (question) => ({
        ...question,
        hash: await getQuestionHash(question),
      })),
    );
    const questionsWithHashAsObject = questsionsWithHash.reduce(
      (acc, question) => ({
        ...acc,
        [question.hash]: question,
      }),
      {},
    );

    chrome.storage.local.set({
      questionMap: { ...savedQuestionMap, ...questionsWithHashAsObject },
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
