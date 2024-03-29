var s = document.createElement('script');
s.src = chrome.runtime.getURL('injected.js');
s.onload = function() {
	this.remove();
};
(document.head || document.documentElement).appendChild(s);

let courseId = undefined

const handleLoadLessonForStudent = async (body) => {
	if (!courseId) return
	const savedQuestionMap = await chrome.storage.local.get([courseId, "questionMap"]).then(a => a[courseId]?.questionMap)

	const questionMapWithKnownAnswers = Object.fromEntries(
		Object.entries(body.questionMap).filter(([key, value]) => {
			const { correctAnswerIndex, pairList, correctAnswerIndexList, correctAnswerOrder } = value
			if (correctAnswerIndex !== null && correctAnswerIndex !== undefined)
				return true

			if (pairList !== null && pairList !== undefined)
				return true

			if (correctAnswerIndexList !== null && correctAnswerIndexList !== undefined)
				return true

			if(correctAnswerOrder !== null && correctAnswerOrder !== undefined)
				return true
			
			return false
		})
	)
	console.log("uuHappines: Loaded", questionMapWithKnownAnswers)

	chrome.storage.local.set({ [courseId]: { "questionMap": { ...savedQuestionMap, ...questionMapWithKnownAnswers } } })
	alert("uuHappiness: Loaded")
}

const handleUrl = (url) => {
	courseId = url.match(/(?<=uu-coursekit-courseg01\/)[^\/]*/)[0]
	chrome.storage.local.get([courseId, "questionMap"]).then(courseQuestions =>
		console.log("uuHappiness: Course questions", courseQuestions[courseId]?.questionMap
		))
}

window.addEventListener('message', e => {
	if (e.data.type === "loadLessonForStudenResponse")
		handleLoadLessonForStudent(e.data.body)

	if (e.data.type === "url")
		handleUrl(e.data.url)

	if (e.data.type === "question") {
		try {
			chrome.runtime.sendMessage(undefined, { type: "question", question: e.data.question, courseId })
		} catch {}
	}
});
