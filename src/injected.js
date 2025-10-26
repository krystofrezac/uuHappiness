const { fetch: origFetch } = window;

/** IT'S DUPLICATED IN content.js */
const getQuestionHash = async (question) => {
  const sortedAnswerList = [...(question.answerList ?? [])]
    // Because of T06 which has array of arrays
    .flat()
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  const hashSource = [
    JSON.stringify(question.task),
    JSON.stringify(sortedAnswerList),
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

const addUuStringToTask = (task) => {
  if (task.includes("<uu5string/>")) return task;
  return `<uu5string/>${task}`;
};

const overrideFetch = () => {
  const addHashPlacholderToTask = async (question) => {
    const { task } = question;
    console.log("hash", question, await getQuestionHash(question));
    const placholder = `<span style=\"<uu5json/>{\\\"font-size\\\": \\\"0\\\", \\\"opacity\\\": \\\"0\\\"}\">[question_hash:${await getQuestionHash(question)}]</span>`;

    if (!task) return placholder;

    if (typeof task === "string")
      return addUuStringToTask(`${task}${placholder}`);

    return {
      ...task,
      cs: addUuStringToTask(`${task.cs}${placholder}`),
      en: addUuStringToTask(`${task.en}${placholder}`),
    };
  };

  const handleLessonResponse = (response) => {
    response
      .clone()
      .json()
      .then(async (body) => {
        const questionMapEntriesPromises = body.lessonContentList.map(
          async (question) => [await getQuestionHash(question), question],
        );
        const questionMap = Object.fromEntries(
          await Promise.all(questionMapEntriesPromises),
        );
        console.log("Saving ", questionMap);
        window.postMessage({ type: "saveLesson", questionMap }, "*");
      });
    alert("uuHappiness: Loaded");
  };

  const getLessonTextMiddleware = (response) => async () => {
    const json = await response
      .clone()
      .json()
      .then(async (data) => {
        const mappedLessonContentListPromises = data.lessonContentList.map(
          async (question) => {
            const mappedQuestion = {
              ...question,
              task: await addHashPlacholderToTask(question),
            };
            return mappedQuestion;
          },
        );
        const mappedLessonContentList = await Promise.all(
          mappedLessonContentListPromises,
        );
        return { ...data, lessonContentList: mappedLessonContentList };
      });
    return JSON.stringify(json);
  };

  const getTestTextMiddleware = (response) => async () => {
    const json = await response
      .clone()
      .json()
      .then(async (data) => {
        const mappedQuestionListPromises = data.testContentList.map(
          async (question) => ({
            ...question,
            task: await addHashPlacholderToTask(question),
          }),
        );
        const mappedQuestionList = await Promise.all(
          mappedQuestionListPromises,
        );
        return { ...data, testContentList: mappedQuestionList };
      });
    return JSON.stringify(json);
  };

  window.fetch = async (...args) => {
    const response = await origFetch(...args);
    const url = response.url;

    if (url.includes("/lesson/loadContentForStudentByBidAndOid")) {
      handleLessonResponse(response);
      response.text = getLessonTextMiddleware(response);
    }
    if (url.includes("/test/loadContentByBidAndOid")) {
      response.text = getTestTextMiddleware(response);
    }
    return response;
  };
};

const watchCurrentQuestion = () => {
  let currentQuestionHash;

  setInterval(() => {
    const html = document.body.innerHTML;

    const questionHash = html.match(/(?<=\[question_hash:)[^\]]+(?=\])/)?.[0];
    if (!questionHash) return;
    if (currentQuestionHash === questionHash) return;
    currentQuestionHash = questionHash;

    console.debug(`Detected question hash [${questionHash}]`);
    console.debug(`Sending "getQuestion" message`);
    window.postMessage({
      type: "getQuestion",
      questionHash,
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
    if (messageEvent.data.type === "getQuestionResult") {
      console.debug("Received 'getQuestionResult'", messageEvent.data);
      question = messageEvent.data.question;
    }
  });

  const getMaybeLocalizedValue = (task) => {
    if (typeof task === "string") return task;

    if (task.cs) return task.cs;
    if (task.en) return task.en;
    return "?";
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

  const removeUuXml = (source) =>
    source
      .replaceAll("<uu5string/>", "")
      .replaceAll(/style="[^"]*"/g, "")
      .replace(
        /<Uu5RichTextBricks\.Block[^>]*uu5String="([^"]*)"[^>]*\/>/g,
        (_, uu5String) => uu5String,
      );

  const getMessage = (source) => removeUuXml(getMaybeLocalizedValue(source));

  const openDialog = () => {
    console.info("question", question);
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

    if (!question) return answerContainer.append("Don't know this question :(");

    const typeMap = {
      // One correct
      T01: () => getMessage(question.answerList[0]),
      // One correct
      T02: () => getMessage(question.answerList[0]),
      // Multi choice
      T03: () =>
        makeOl(
          question.correctAnswerIndexList.map((answerIndex) =>
            getMessage(question.answerList[answerIndex]),
          ),
        ),
      // Pairing
      T06: () =>
        makeDiv(
          question.answerList.map((answer, index) => {
            const isLast = question.answerList.length - 1 === index;
            const mappedParts = answer.map((part) => getMessage(part));

            const children = [makeUl(mappedParts)];
            if (!isLast) children.push(makeHr());
            return makeDiv(children);
          }),
        ),
      // Order
      T07: () =>
        makeOl(question.answerList.map((answer) => getMessage(answer))),

      // Yes/no
      T08: () => `${question.correctAnswer ? "Yes" : "No"}`,
    };

    const render = typeMap[question.type];
    if (!render)
      return answerContainer.append(
        `Don't know how to render answer to ${question.type}`,
      );
    answerContainer.append(render());
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
      "div[class*=uucoursekitcore-question-]",
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
    button.style.cssText =
      "background: black; opacity: 0.05; border: none; cursor: pointer; height: 50px; width: 50px;";
    button.onclick = toggleDialog;
    container.append(button);
  }, 100);
};

overrideFetch();
watchCurrentQuestion();
addAnswerUi();
