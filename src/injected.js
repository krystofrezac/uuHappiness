const { fetch: origFetch } = window;

const courseId = window.location.href.match(
  /(?<=uu-coursekit-courseg01\/)[^\/]*/,
)[0];

const addRawTask = (task) => {
  const getPlaceholder = (text) => `[raw_task:${encodeURIComponent(text)}]`;

  if (!task.cs) return `${task}${getPlaceholder(task)}`;

  return {
    ...task,
    cs: `${task.cs}${getPlaceholder(task.cs)}`,
    en: `${task.en}${getPlaceholder(task.en)}`,
  };
};

const handleLessonResponse = (response) => {
  response
    .clone()
    .json()
    .then((body) => {
      window.postMessage(
        { type: "loadLessonForStudenResponse", body, courseId },
        "*",
      );
    });
};

const getLessonTextMiddleware = (response) => async () => {
  const json = await response
    .clone()
    .json()
    .then((data) => {
      const mappedQuestionMapEntries = Object.entries(data.questionMap).map(
        ([key, value]) => {
          const mappedValue = {
            ...value,
            task: addRawTask(value.task),
          };
          return [key, mappedValue];
        },
      );
      const mappedQuestionMap = Object.fromEntries(mappedQuestionMapEntries);
      return { ...data, questionMap: mappedQuestionMap };
    });
  return JSON.stringify(json);
};

const getTestTextMiddleware = (response) => async () => {
  const json = await response
    .clone()
    .json()
    .then((data) => {
      const mappedQuestionList = data.questionList.map((question) => ({
        ...question,
        task: addRawTask(question.task),
      }));
      return { ...data, questionList: mappedQuestionList };
    });
  return JSON.stringify(json);
};

const overrideFetch = () => {
  window.fetch = async (...args) => {
    const response = await origFetch(...args);
    const url = response.url;

    if (url.includes("loadLessonForStudent")) {
      handleLessonResponse(response);
      response.text = getLessonTextMiddleware(response);
    }
    if (url.includes("loadTestForStudent")) {
      response.text = getTestTextMiddleware(response);
    }
    return response;
  };
};

const watchCurrentQuestion = () => {
  setInterval(() => {
    const containerHtml = document.querySelector(
      "div[class*=uu-coursekit-question-t]",
    )?.innerHTML;
    if (!containerHtml) return;

    const rawTask = containerHtml.match(/(?<=\[raw_task:)[^\]]+(?=\])/)?.[0];
    if (!rawTask) return;

    const rawTaskDecoded = decodeURIComponent(rawTask);
    console.log(rawTaskDecoded);

    window.postMessage({
      type: "questionChange",
      task: rawTaskDecoded,
      courseId,
    });
  }, 100);
};

overrideFetch();
watchCurrentQuestion();
