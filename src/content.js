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
    const { lesson, courseId } = message;

    const savedQuestionMap = await chrome.storage.local
      .get([courseId, "questionMap"])
      .then((value) => value[courseId]?.questionMap);

    const answerFields = [
      "correctAnswerIndex",
      "pairList",
      "correctAnswerIndexList",
      "correctAnswerOrder",
      "tripletList",
    ];

    const questionMapEntries = Object.entries(lesson.questionMap);
    const questionMapWithAnswersEntries = questionMapEntries.filter(
      ([_, question]) =>
        answerFields.some((answerField) => {
          const fieldValue = question[answerField];
          return fieldValue !== undefined && fieldValue !== null;
        }),
    );
    const quetsionMapWithAnswers = Object.fromEntries(
      questionMapWithAnswersEntries,
    );

    chrome.storage.local.set({
      [courseId]: {
        questionMap: { ...savedQuestionMap, ...quetsionMapWithAnswers },
      },
    });
  };

  const handleGetQuestion = async (message) => {
    const { questionHash, courseId } = message;

    const questionMap = await chrome.storage.local
      .get([courseId, "questionMap"])
      .then((value) => value[courseId]?.questionMap);

    if (!questionMap) {
      window.postMessage({
        type: "getQuestionResult",
        question: undefined,
      });
    }

    const questionMapValues = Object.values(questionMap);
    const questionsWithMatchedPromises = questionMapValues.map(
      async (question) => {
        const currentQuestionHash = await getQuestionHash(question);
        return { matched: currentQuestionHash === questionHash, question };
      },
    );
    const questionsWithMatched = await Promise.all(
      questionsWithMatchedPromises,
    );
    const foundQuestion = questionsWithMatched.find(
      (question) => question.matched,
    )?.question;

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
