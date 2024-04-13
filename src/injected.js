const { fetch: origFetch } = window;

const courseId = window.location.href.match(
  /(?<=uu-coursekit-courseg01\/)[^\/]*/,
)[0];

/** IT'S DUPLICATED IN content.js */
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

const overrideFetch = () => {
  const addHashPlacholderToTask = async (question) => {
    const { task } = question;
    const placholder = `[question_hash:${await getQuestionHash(question)}]\\n`;

    if (!task) return placholder;

    if (!task.cs) return `${task}${placholder}`;

    return {
      ...task,
      cs: `${task.cs}${placholder}`,
      en: `${task.en}${placholder}`,
    };
  };

  const handleLessonResponse = (response) => {
    response
      .clone()
      .json()
      .then((body) => {
        window.postMessage({ type: "saveLesson", lesson: body, courseId }, "*");
      });
    alert("uuHappiness: Loaded");
  };

  const getLessonTextMiddleware = (response) => async () => {
    const json = await response
      .clone()
      .json()
      .then(async (data) => {
        const mappedQuestionMapEntriesPromises = Object.entries(
          data.questionMap,
        ).map(async ([key, question]) => {
          const mappedQuestion = {
            ...question,
            task: await addHashPlacholderToTask(question),
          };
          return [key, mappedQuestion];
        });
        const mappedQuestionMapEntries = await Promise.all(
          mappedQuestionMapEntriesPromises,
        );
        const mappedQuestionMap = Object.fromEntries(
          await Promise.all(mappedQuestionMapEntries),
        );
        return { ...data, questionMap: mappedQuestionMap };
      });
    return JSON.stringify(json);
  };

  const getTestTextMiddleware = (response) => async () => {
    const json = await response
      .clone()
      .json()
      .then(async (data) => {
        const mappedQuestionListPromises = data.questionList.map(
          async (question) => ({
            ...question,
            task: await addHashPlacholderToTask(question),
          }),
        );
        const mappedQuestionList = await Promise.all(
          mappedQuestionListPromises,
        );
        return { ...data, questionList: mappedQuestionList };
      });
    return JSON.stringify(json);
  };

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
  let currentQuestionHash;

  setInterval(() => {
    const container = document.querySelector(
      "div[class*=uu-coursekit-question-t]",
    );
    const containerHtml = container?.innerHTML;
    if (!containerHtml) return;

    const questionHash = containerHtml.match(
      /(?<=\[question_hash:)[^\]]+(?=\])/,
    )?.[0];
    if (!questionHash) return;
    if (currentQuestionHash === questionHash) return;
    currentQuestionHash = questionHash;

    window.postMessage({
      type: "getQuestion",
      questionHash,
      courseId,
    });
    document.getElementById(DIALOG_ID)?.remove();
  }, 100);
};

const DIALOG_ID = "uuHappiness_dialog";
const addAnswerUi = () => {
  const CONTAINER_ID = "uuHappiness_container";

  let iconUrl;
  let question;
  window.addEventListener("message", (messageEvent) => {
    if (messageEvent.data.type === "iconUrl")
      iconUrl = messageEvent.data.iconUrl;
    if (messageEvent.data.type === "getQuestionResult")
      question = messageEvent.data.question;
  });

  const getMaybeLocalizedValue = (task) => {
    if (typeof task === "string") return task;

    return task.cs;
  };
  const isDefined = (value) => value !== undefined && value !== null;

  const makeDiv = (content) => {
    const div = document.createElement("div");
    if (Array.isArray(content)) div.append(...content);
    else div.append(content);
    return div;
  };
  const makeUl = (items) => {
    const ul = document.createElement("ul");
    const mappedItems = items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      ul.append(li);
      return li;
    });
    ul.append(...mappedItems);
    return ul;
  };
  const makeOl = (items) => {
    const ol = document.createElement("ol");
    const mappedItems = items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      ol.append(li);
      return li;
    });
    ol.append(...mappedItems);
    return ol;
  };
  const makeHr = () => {
    const hr = document.createElement("hr");
    hr.style.cssText = "background-color: #BDBDBD";
    return hr;
  };

  const renderUknownQuestion = () => {
    return "Don't know answer for this question. Maybe you forgot to load it?";
  };
  const renderSingleAnswerFromList = () => {
    return getMaybeLocalizedValue(
      question.answerList[question.correctAnswerIndex],
    );
  };
  const renderYesNoAnswer = () => {
    return question.correctAnswerIndex === 0 ? "Ano" : "Ne";
  };
  const renderMultiPlaceholderAnswer = () => {};
  const renderMultiAnswer = () => {
    const correctAnswers = question.answerList
      .filter((_, index) => question.correctAnswerIndexList.includes(index))
      .map(getMaybeLocalizedValue);
    if (correctAnswers.length > 0) return makeUl(correctAnswers);

    return "Žádná z předcházejících odpovědí není správná.";
  };
  const renderOrderAnswer = () => {
    const answersInOrder = question.correctAnswerOrder.map((answerIndex) =>
      getMaybeLocalizedValue(question.answerList[answerIndex]),
    );

    return makeOl(answersInOrder);
  };
  const renderPairAnswer = () => {
    return question.pairList.map((pair, index) => {
      const first = getMaybeLocalizedValue(
        question.answerList[0][pair.answerIndex],
      );
      const second = getMaybeLocalizedValue(
        question.answerList[1][pair.pairAnswerIndex],
      );
      const children = [makeUl([first, second])];

      const isLast = question.pairList.length === index + 1;
      if (!isLast) {
        children.push(makeHr());
      }

      return makeDiv(children);
    });
  };
  const renderTripletAnswer = () => {
    question.tripletList.map((triplet) => {
      const first = getMaybeLocalizedValue(question.answerList[0][triplet[0]]);
      const second = getMaybeLocalizedValue(question.answerList[1][triplet[1]]);
      const third = getMaybeLocalizedValue(question.answerList[2][triplet[2]]);
      const children = [makeUl([first, second, third])];

      const isLast = question.pairList.length === index + 1;
      if (!isLast) {
        children.push(makeHr());
      }

      return makeDiv(children);
    });
  };
  const renderUnknownQuestionType = () => {
    return "Don't know how to process this type of question :(";
  };

  const openDialog = () => {
    const dialog = document.createElement("div");
    dialog.id = DIALOG_ID;
    dialog.style.cssText =
      "width: 400px; background: white; border-radius: 8px; margin-bottom: 8px; box-shadow: rgba(0, 0, 0, 0.4) 0px 2px 16px 0px;";
    document.getElementById(CONTAINER_ID).prepend(dialog);

    const title = document.createElement("div");
    title.textContent = "Answer";
    title.style.cssText =
      "font-weight: bold; font-size: 18px; padding: 20px; background: #F5F5F5; color: #5B6071; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;";
    dialog.append(title);

    const answerContainer = document.createElement("div");
    answerContainer.style.cssText = "padding: 20px; color: #5E646A;";
    dialog.append(answerContainer);

    if (!question) return answerContainer.append(renderUknownQuestion());
    if (isDefined(question.correctAnswerIndex) && question.answerList)
      return answerContainer.append(renderSingleAnswerFromList());
    if (isDefined(question.correctAnswerIndex))
      return answerContainer.append(renderYesNoAnswer());
    if (
      question.correctAnswerIndexList &&
      Array.isArray(question.answerList[0])
    )
      return answerContainer.append(renderMultiPlaceholderAnswer());
    if (question.correctAnswerIndexList)
      return answerContainer.append(renderMultiAnswer());
    if (question.correctAnswerOrder)
      return answerContainer.append(renderOrderAnswer());
    if (question.pairList) return answerContainer.append(...renderPairAnswer());
    if (question.tripletList)
      return answerContainer.append(renderTripletAnswer());

    answerContainer.append(renderUnknownQuestionType());
  };
  const closeDialog = () => {
    document.getElementById(DIALOG_ID).remove();
  };
  const toggleDialog = () => {
    if (!!document.getElementById(DIALOG_ID)) {
      closeDialog();
      return;
    }
    openDialog();
  };

  setInterval(() => {
    if (!iconUrl) return;
    const isQuestion = !!document.querySelector(
      "div[class*=uu-coursekit-question-t]",
    );
    if (!isQuestion) {
      document.getElementById(CONTAINER_ID)?.remove();
      return;
    }

    const containerExists = !!document.getElementById(CONTAINER_ID);
    if (containerExists) return;

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.style.cssText =
      "position: fixed; bottom: 8px; right: 8px; display: flex; flex-direction: column; align-items: flex-end;";
    document.body.append(container);

    const button = document.createElement("button");
    button.style.cssText = "background: none; border: none; cursor: pointer;";
    button.onclick = toggleDialog;
    container.append(button);

    const icon = document.createElement("img");
    icon.src = iconUrl;
    icon.style.cssText = "border-radius: 100%; width: 50px;";
    button.append(icon);
  }, 100);
};

overrideFetch();
watchCurrentQuestion();
addAnswerUi();
