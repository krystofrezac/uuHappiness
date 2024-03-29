var s = document.createElement("script");
s.src = chrome.runtime.getURL("injected.js");
s.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(s);

const handleLoadLessonForStudent = async (data) => {
  alert("receive" + courseId);
  const { courseId, questionMap } = data;

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

const handleUrl = (url) => {
  chrome.storage.local
    .get([courseId, "questionMap"])
    .then((courseQuestions) =>
      console.log(
        "uuHappiness: Course questions",
        courseQuestions[courseId]?.questionMap,
      ),
    );
};

window.addEventListener("message", (e) => {
  if (e.data.type === "loadLessonForStudenResponse")
    handleLoadLessonForStudent(e.data);

  if (e.data.type === "question") {
    try {
      chrome.runtime.sendMessage(undefined, {
        type: "questionChange",
        questionId: e.data.questionId,
        courseId: e.data.courseId,
      });
    } catch {}
  }
});
