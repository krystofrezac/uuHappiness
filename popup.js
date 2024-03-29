const clearText = (text) => 
	text.replaceAll("__", " ").replaceAll(/<\/?[uU]{2}[^>]*>/g, "").replaceAll(/\s+/g, " ").trim()

chrome.runtime.onMessage.addListener(async (message) => {
	if (message.type !== "question")
		return

	const clearedQuestion = clearText(message.question)
	const questionWords = clearedQuestion.split(" ")

	document.getElementById("question").innerText = clearedQuestion

	const questionMap = await chrome.storage.local.get([message.courseId, "questionMap"]).then(a => a[message.courseId]?.questionMap)

	const matchingQuestions = Object.values(questionMap).filter(question =>
		questionWords.every(questionWord => question.task && clearText(question.task.cs).includes(questionWord))
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
			const correctAnswer = matchingQuestion.answerList[matchingQuestion.correctAnswerIndex]
			document.getElementById("answer").innerText = typeof correctAnswer === 'string' ? correctAnswer : correctAnswer.cs
		} else {
			document.getElementById("answer").innerText = matchingQuestion.correctAnswerIndex === 0 ? "Ano" : "Ne"
		}
		return
	}

	if (![undefined, null].includes(matchingQuestion.correctAnswerIndexList)) {
		const isMultiPlacholder = Array.isArray(matchingQuestion.answerList[0])
		if(isMultiPlacholder){
			const correctAnswer = matchingQuestion.answerList.map((_, index)=>{
				const correctAnswer = matchingQuestion.answerList[index].filter((_, index) => matchingQuestion.correctAnswerIndexList.includes(index)).map(answer => "- " + (typeof answer === 'string' ? answer: answer.cs)).join("\n")
				
				return `--${index+1}--\n${correctAnswer}\n\n`
			}).join("\n")
			document.getElementById("answer").innerText = correctAnswer
			return
		}
		const correctAnswer = matchingQuestion.answerList.filter((_, index) => matchingQuestion.correctAnswerIndexList.includes(index)).map(answer => "- " + (typeof answer === 'string' ? answer: answer.cs)).join("\n")
		document.getElementById("answer").innerText = correctAnswer
		return
	}

	if (![undefined, null].includes(matchingQuestion.correctAnswerOrder)) {
		const text = matchingQuestion.correctAnswerOrder.map((answerIndex, index) => {
			const anwser = matchingQuestion.answerList[answerIndex]
			return `${index + 1}. ${typeof anwser === 'string' ? anwser: anwser.cs}`
		}).join("\n")
		document.getElementById("answer").innerText = text
		return
	}


	if (![undefined, null].includes(matchingQuestion.pairList)) {
		const text = matchingQuestion.pairList.map(({ answerIndex, pairAnswerIndex }) => {
			const answer = matchingQuestion.answerList[0][answerIndex];
			const pair = matchingQuestion.answerList[1][pairAnswerIndex];
			return `${typeof answer === 'string' ? answer : answer.cs}: ${typeof pair === 'string' ? pair : pair.cs}`
		}).join("\n")
		document.getElementById("answer").innerText = text
		return
	}
})
