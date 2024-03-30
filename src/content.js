const injectScript = () => {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/injected.js");
  (document.head || document.documentElement).appendChild(script);
};

injectScript();

// TODO: make it beatifull
const handleLoadLessonForStudent = async (data) => {
  const {
    courseId,
    body: { questionMap },
  } = data;

  const savedQuestionMap = await chrome.storage.local
    .get([courseId, "questionMap"])
    .then((a) => a[courseId]?.questionMap);

  const questionMapWithKnownAnswers = Object.fromEntries(
    Object.entries(questionMap).filter(([key, value]) => {
      const {
        correctAnswerIndex,
        pairList,
        correctAnswerIndexList,
        correctAnswerOrder,
        tripletList,
      } = value;
      if (correctAnswerIndex !== null && correctAnswerIndex !== undefined)
        return true;

      if (pairList !== null && pairList !== undefined) return true;

      if (
        correctAnswerIndexList !== null &&
        correctAnswerIndexList !== undefined
      )
        return true;

      if (correctAnswerOrder !== null && correctAnswerOrder !== undefined)
        return true;

      if (tripletList !== null && tripletList !== undefined) return true;

      return false;
    }),
  );
  console.log("uuHappines: Loaded", questionMapWithKnownAnswers);

  chrome.storage.local.set({
    [courseId]: {
      questionMap: { ...savedQuestionMap, ...questionMapWithKnownAnswers },
    },
  });
  alert("uuHappiness: Loaded");
};

window.addEventListener("message", (e) => {
  if (e.data.type === "loadLessonForStudenResponse")
    handleLoadLessonForStudent(e.data);

  if (e.data.type === "questionChange") {
    chrome.runtime.sendMessage(
      undefined,
      {
        type: "questionChange",
        task: e.data.task,
        courseId: e.data.courseId,
      },
      () => {
        // Here to silence chrome errors
        chrome.runtime.lastError;
      },
    );
  }
});
