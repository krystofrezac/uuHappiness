chrome.runtime.onMessage.addListener(async (message) => {
	if (message.type !== "question")
		return

	const clearedQuestion = message.question.replaceAll(/\s+/g, " ").trim()
	const questionWords = clearedQuestion.split(" ")

	document.getElementById("question").innerText = clearedQuestion

	const questionMap = await chrome.storage.local.get([message.courseId, "questionMap"]).then(a => a[message.courseId]?.questionMap)

	const matchingQuestions = Object.values(questionMap).filter(question =>
		questionWords.every(questionWord => question.task && question.task.cs.replaceAll(/<\/?[uU]{2}[^>]*>/g, "").includes(questionWord))
	)

	const matchingQuestion = matchingQuestions?.[0]
	if (!matchingQuestion) {
		document.getElementById("answer").innerText = "Don't know"
		return
	}

	if (matchingQuestions.length > 1) {
		document.getElementById("warning").innerText = "Warning: Multiple matching answers found. Showing the first one."
	} else {
		document.getElementById("warning").innerText = ""
	}

	if (![undefined, null].includes(matchingQuestion.correctAnswerIndex)) {
		if (matchingQuestion.answerList) {
			const correctAnswer = matchingQuestion.answerList[matchingQuestion.correctAnswerIndex].cs
			document.getElementById("answer").innerText = correctAnswer
		} else {
			document.getElementById("answer").innerText = matchingQuestion.correctAnswerIndex === 0 ? "Ano" : "Ne"
		}
		return
	}

	if (![undefined, null].includes(matchingQuestion.correctAnswerIndexList)) {
		const correctAnswer = matchingQuestion.answerList.filter((_, index) => matchingQuestion.correctAnswerIndexList.includes(index)).map(answer => "- " + answer.cs).join("\n")
		document.getElementById("answer").innerText = correctAnswer
		return
	}

	if (![undefined, null].includes(matchingQuestion.correctAnswerOrder)) {
		const text = matchingQuestion.correctAnswerOrder.map((answerIndex, index) => {
			const anwser = matchingQuestion.answerList[answerIndex].cs
			return `${index + 1}. ${anwser}`
		}).join("\n")
		document.getElementById("answer").innerText = text
		return
	}


	if (![undefined, null].includes(matchingQuestion.pairList)) {
		const text = matchingQuestion.pairList.map(({ answerIndex, pairAnswerIndex }) => {
			const answer = matchingQuestion.answerList[0][answerIndex].cs;
			const pair = matchingQuestion.answerList[1][pairAnswerIndex].cs;
			return `${answer}: ${pair}`
		}).join("\n")
		document.getElementById("answer").innerText = text
		return
	}
})
