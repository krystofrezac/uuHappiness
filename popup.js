const getMaybeLocalizedText = (task) => {
  if (typeof task === "string") return task;

  return task.cs;
};

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type !== "questionChange") return;

  const { task, courseId } = message;

  document.getElementById("question").innerText = task;

  const questions = await chrome.storage.local
    .get([courseId, "questionMap"])
    .then((course) => course[courseId]?.questionMap);

  const question = Object.values(questions).find((question) => {
    return getMaybeLocalizedText(question.task) === task;
  });

  if (!question) {
    document.getElementById("answer").innerText = "Don't know";
    return;
  }

  if (![undefined, null].includes(question.correctAnswerIndex)) {
    if (question.answerList) {
      const correctAnswer = question.answerList[question.correctAnswerIndex];
      document.getElementById("answer").innerText =
        typeof correctAnswer === "string" ? correctAnswer : correctAnswer.cs;
    } else {
      document.getElementById("answer").innerText =
        question.correctAnswerIndex === 0 ? "Ano" : "Ne";
    }
    return;
  }

  if (![undefined, null].includes(question.correctAnswerIndexList)) {
    const isMultiPlacholder = Array.isArray(question.answerList[0]);
    if (isMultiPlacholder) {
      const correctAnswer = question.answerList
        .map((_, index) => {
          const correctAnswer = question.answerList[index]
            .filter((_, index) =>
              question.correctAnswerIndexList.includes(index),
            )
            .map(
              (answer) =>
                "- " + (typeof answer === "string" ? answer : answer.cs),
            )
            .join("\n");

          return `--${index + 1}--\n${correctAnswer}\n\n`;
        })
        .join("\n");
      document.getElementById("answer").innerText = correctAnswer;
      return;
    }
    const correctAnswer = question.answerList
      .filter((_, index) => question.correctAnswerIndexList.includes(index))
      .map((answer) => "- " + (typeof answer === "string" ? answer : answer.cs))
      .join("\n");
    document.getElementById("answer").innerText = correctAnswer;
    return;
  }

  if (![undefined, null].includes(question.correctAnswerOrder)) {
    const text = question.correctAnswerOrder
      .map((answerIndex, index) => {
        const anwser = question.answerList[answerIndex];
        return `${index + 1}. ${
          typeof anwser === "string" ? anwser : anwser.cs
        }`;
      })
      .join("\n");
    document.getElementById("answer").innerText = text;
    return;
  }

  if (![undefined, null].includes(question.pairList)) {
    const text = question.pairList
      .map(({ answerIndex, pairAnswerIndex }, index) => {
        const answer = question.answerList[0][answerIndex];
        const pair = question.answerList[1][pairAnswerIndex];
        return `${index + 1}:\n${getMaybeLocalizedText(
          answer,
        )}\n${getMaybeLocalizedText(pair)}`;
      })
      .join("\n\n");
    document.getElementById("answer").innerText = text;
    return;
  }

  if (![undefined, null].includes(question.tripletList)) {
    console.log("question", question);
    const text = question.tripletList
      .map(([first, second, third], index) => {
        const firstAnswer = question.answerList[0][first];
        const secondAnswer = question.answerList[1][second];
        const thirdAnswer = question.answerList[2][third];
        return `${index + 1}:\n${getMaybeLocalizedText(
          firstAnswer,
        )}\n${getMaybeLocalizedText(secondAnswer)}\n${getMaybeLocalizedText(
          thirdAnswer,
        )}`;
      })
      .join("\n\n");
    document.getElementById("answer").innerText = text;
    return;
  }
});
