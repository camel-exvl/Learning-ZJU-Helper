// ==UserScript==
// @name         Learning ZJU Helper
// @namespace    https://github.com/camel-exvl/Learning-ZJU-Helper
// @version      1.2.3
// @description  show score in course
// @author       camel-exvl
// @updateURL    https://raw.githubusercontent.com/camel-exvl/Learning-ZJU-Helper/master/Learning-ZJU-Helper.js
// @downloadURL  https://raw.githubusercontent.com/camel-exvl/Learning-ZJU-Helper/master/Learning-ZJU-Helper.js
// @match        https://courses.zju.edu.cn/course/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zju.edu.cn
// @license      MIT
// @grant        none
// ==/UserScript==

// 监听URL变化
// https://stackoverflow.com/questions/3522090/event-when-window-location-href-changes
const observeURLChange = (callback) => {
	let oldHref = document.location.href;
	const body = document.querySelector("body");
	const observer = new MutationObserver((mulations) => {
		if (oldHref != document.location.href) {
			oldHref = document.location.href;
			callback();
			observer.disconnect();
		}
	});
	observer.observe(body, { childList: true, subtree: true });
};

// 休眠
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// 等待元素加载完成且满足条件后执行回调函数
function waitElement(selector, callback, condition = true) {
	let element = document.querySelector(selector);
	if (element && condition) {
		callback(element);
	} else {
		setTimeout(() => {
			waitElement(selector, callback);
		}, 500);
	}
}

var header = {
	Accept: "application/json;charset=UTF-8",
	"Content-Type": "application/json;charset=UTF-8",
	Cookie: document.cookie
};

var homeworkStudentStatus;
var enrollments;

// 获取作业信息
function getActivities() {
	let courseID = window.location.href.split("/")[4];
	let activityForUser;
	let activities;
	fetch(`https://courses.zju.edu.cn/api/course/${courseID}/activity-reads-for-user`, {
		method: "GET",
		headers: header
	})
		.then((res) => res.json())
		.then((res) => {
			activityForUser = res["activity_reads"];
			console.log("[Learning ZJU Helper] get activity-reads-for-user success");
		})
		.catch((err) => {
			console.log("[Learning ZJU Helper] get activity-reads-for-user failed: " + err);
			return new Promise((resolve, reject) => {
				reject();
			});
		});

	fetch(`https://courses.zju.edu.cn/api/courses/${courseID}/activities`, {
		method: "GET",
		headers: header
	})
		.then((res) => res.json())
		.then((res) => {
			activities = res["activities"];
			console.log("[Learning ZJU Helper] get activities success");
		})
		.catch((err) => {
			console.log("[Learning ZJU Helper] get activities failed: " + err);
			return new Promise((resolve, reject) => {
				reject();
			});
		});

	return new Promise((resolve, reject) => {
		let interval = setInterval(() => {
			if (activityForUser && activities) {
				clearInterval(interval);
				resolve([activityForUser, activities]);
			}
		}, 500);
	});
}

// 获取统计信息
function getStatistics() {
	let courseID = window.location.href.split("/")[4];
	fetch(`https://courses.zju.edu.cn/api/course/${courseID}/homework-student-status`, {
		method: "GET",
		headers: header
	})
		.then((res) => res.json())
		.then((res) => {
			homeworkStudentStatus = res;
			console.log("[Learning ZJU Helper] get homework-student-status success");
		})
		.catch((err) => {
			console.log("[Learning ZJU Helper] get homework-student-status failed: " + err);
		});
	let enrollmentsJson;
	fetch(`https://courses.zju.edu.cn/api/course/${courseID}/enrollments?fields=user(id,name,user_no)`, {
		method: "GET",
		headers: header
	})
		.then((res) => res.json())
		.then((res) => {
			enrollmentsJson = res["enrollments"];
			enrollments = new Map();
			for (let i = 0; i < enrollmentsJson.length; i++) {
				// delete number in name
				enrollmentsJson[i]["user"]["name"] = enrollmentsJson[i]["user"]["name"].replace(/[0-9]/g, "");
				enrollments.set(enrollmentsJson[i]["user"]["id"], enrollmentsJson[i]["user"]);
			}
			console.log("[Learning ZJU Helper] get enrollments success");
		})
		.catch((err) => {
			console.log("[Learning ZJU Helper] get enrollments failed: " + err);
		});
}

// 作业页面显示成绩
function showScoreInHomework() {
	getActivities().then((res) => {
		let activityForUser = res[0];
		let activities = res[1];

		// modify table header
		if (document.getElementsByClassName("large-12 column").length != 0) {
			let tableHeader = document.getElementsByClassName("column-header row collapse")[0];
			let statusElement = tableHeader.getElementsByClassName("large-4 column")[0];
			statusElement.className = "large-2 column";
			let scoreElement = tableHeader.getElementsByClassName("large-12 column")[0];
			scoreElement.className = "large-4 column";
			let formElement = tableHeader.getElementsByClassName("large-6 column")[0];
			formElement.className = "large-4 column";
			let highestScoreElement = document.createElement("div");
			highestScoreElement.className = "large-2 column";
			highestScoreElement.innerHTML = "<span>最高分</span>";
			tableHeader.appendChild(highestScoreElement);
			let averageScoreElement = document.createElement("div");
			averageScoreElement.className = "large-2 column";
			averageScoreElement.innerHTML = "<span>平均分</span>";
			tableHeader.appendChild(averageScoreElement);
			let lowestScoreElement = document.createElement("div");
			lowestScoreElement.className = "large-2 column";
			lowestScoreElement.innerHTML = "<span>最低分</span>";
			tableHeader.appendChild(lowestScoreElement);
			let statisticsElement = document.createElement("div");
			statisticsElement.className = "large-2 column";
			statisticsElement.innerHTML = "<span>提交情况</span>";
			tableHeader.appendChild(statisticsElement);
			let emptyElement = document.createElement("div");
			emptyElement.className = "large-2 column";
			tableHeader.appendChild(emptyElement);
		}

		let homeworkList = document.getElementsByClassName("list-item row collapse ng-scope");
		for (let i = 0; i < homeworkList.length; i++) {
			let scoreElement = homeworkList[i].getElementsByClassName("large-4 column")[1].getElementsByTagName("span")[0];
			let name = homeworkList[i].getElementsByClassName("large-10 column")[0].getElementsByTagName("span")[0].innerText;

			// find activityID
			let activityID;
			let averageScore;
			let highestScore;
			let lowestScore;

			for (let j = 0; j < activities.length; j++) {
				if (activities[j]["title"] == name) {
					activityID = activities[j]["id"];
					averageScore = activities[j]["average_score"];
					highestScore = activities[j]["highest_score"];
					lowestScore = activities[j]["lowest_score"];
					break;
				}
			}

			if (scoreElement.getAttribute("ng-if") == "homework.notAnnounced" || scoreElement.getAttribute("ng-if") == "homework.notPublish") {
				// find score
				let score;
				for (let j = 0; j < activityForUser.length; j++) {
					if (activityForUser[j]["activity_id"] == activityID) {
						score = activityForUser[j]["data"]["score"];
						break;
					}
				}

				// show score
				scoreElement.style.color = "#ffc0cb";
				if (score != null) {
					scoreElement.innerText = score;
				} else {
					scoreElement.innerText = "未评分";
				}
			}

			let endElement;
			if (homeworkList[i].getElementsByClassName("large-8 column end").length != 0) {
				endElement = homeworkList[i].getElementsByClassName("large-8 column end")[0];
				endElement.className = "large-4 column end";
				let statusElement = homeworkList[i].getElementsByClassName("large-4 column")[0];
				statusElement.className = "large-2 column";
				let formElement = homeworkList[i].getElementsByClassName("large-6 group-set column")[0];
				formElement.className = "large-4 group-set column";
			} else {
				endElement = homeworkList[i].getElementsByClassName("large-4 column end")[0];
			}

			// show highest score
			if (highestScore) {
				highestScore = highestScore.toFixed(2);
			} else {
				highestScore = "未评分";
			}
			// if (homeworkList[i].getElementsByClassName("large-2 column").length != 4) {
			if (document.getElementById("highestScore" + i) == null) {
				let highestScoreElement = document.createElement("div");
				highestScoreElement.id = "highestScore" + i;
				highestScoreElement.className = "large-2 column";
				highestScoreElement.innerHTML = `<a class="detail" ng-click="openActivity(homework, false)">
                <span style="color:red">${highestScore}</span></a>`;
				endElement.parentNode.insertBefore(highestScoreElement, endElement);
			} else {
				homeworkList[i].getElementsByClassName("large-2 column")[1].innerHTML = `<a class="detail" ng-click="openActivity(homework, false)">
                <span style="color:red">${highestScore}</span></a>`;
			}

			// show average score
			if (averageScore != null) {
				averageScore = averageScore.toFixed(2);
			} else {
				averageScore = "未评分";
			}
			// if (homeworkList[i].getElementsByClassName("large-2 column").length != 4) {
			if (document.getElementById("averageScore" + i) == null) {
				let averageScoreElement = document.createElement("div");
				averageScoreElement.id = "averageScore" + i;
				averageScoreElement.className = "large-2 column";
				averageScoreElement.innerHTML = `<a class="detail" ng-click="openActivity(homework, false)">
                <span style="color:orange">${averageScore}</span></a>`;
				endElement.parentNode.insertBefore(averageScoreElement, endElement);
			} else {
				homeworkList[i].getElementsByClassName("large-2 column")[2].innerHTML = `<a class="detail" ng-click="openActivity(homework, false)">
                <span style="color:orange">${averageScore}</span></a>`;
			}

			// show lowest score
			if (lowestScore != null) {
				lowestScore = lowestScore.toFixed(2);
			} else {
				lowestScore = "未评分";
			}
			// if (homeworkList[i].getElementsByClassName("large-2 column").length != 4) {
			if (document.getElementById("lowestScore" + i) == null) {
				let lowestScoreElement = document.createElement("div");
				lowestScoreElement.id = "lowestScore" + i;
				lowestScoreElement.className = "large-2 column";
				lowestScoreElement.innerHTML = `<a class="detail" ng-click="openActivity(homework, false)">
			    <span style="color:green">${lowestScore}</span></a>`;
				endElement.parentNode.insertBefore(lowestScoreElement, endElement);
			} else {
				homeworkList[i].getElementsByClassName("large-2 column")[3].innerHTML = `<a class="detail" ng-click="openActivity(homework, false)">
			    <span style="color:green">${lowestScore}</span></a>`;
			}

			// show statistics button
			if (document.getElementById("statistics" + i) == null) {
				let statisticsElement = document.createElement("div");
				statisticsElement.id = "statistics" + i;
				statisticsElement.className = "large-2 column";
				statisticsElement.innerHTML = `<button class="button button-green small gtm-label">
				查看</button>`;
				statisticsElement.children[0].addEventListener("click", function () {
					showStatisticsData(activityID);
				});
				endElement.parentNode.insertBefore(statisticsElement, endElement);
			}

			console.log("[Learning ZJU Helper] show score in homework " + name + " success: score=" + scoreElement.innerText + " highestScore=" + highestScore + " averageScore=" + averageScore + " lowestScore=" + lowestScore);
		}
	});
}

// 显示统计数据
function showStatisticsData(id) {
	// let message = "<table><tr><th>姓名</th><th>学号</th><th>提交情况</th></tr>";
	let data = [];
	let studentNum = 0;
	let submittedNum = 0;
	let markedNum = 0;
	for (let i in homeworkStudentStatus) {
		if (i == id) {
			studentNum = Object.keys(homeworkStudentStatus[i]).length;
			for (let j in homeworkStudentStatus[i]) {
				let student = enrollments.get(parseInt(j));
				let name = "未知",
					user_no = "未知",
					status = "未知";
				if (student != null) {
					name = student["name"];
					user_no = student["user_no"];
				}
				if (homeworkStudentStatus[i][j] != null) {
					switch (homeworkStudentStatus[i][j]) {
						case "un_submitted":
							status = "<span style='color:red'>未提交</span>";
							break;
						case "un_marked":
							status = "<span style='color:orange'>未评分</span>";
							submittedNum++;
							break;
						case "scored":
							status = "<span style='color:green'>已评分</span>";
							submittedNum++;
							markedNum++;
							break;
						default:
							status = homeworkStudentStatus[i][j];
							break;
					}
				}
				data.push({ name: name, user_no: user_no, status: status });
			}
			break;
		}
	}
	let submittedRate = ((submittedNum / studentNum) * 100).toFixed(2);
	let markedRate = ((markedNum / submittedNum) * 100).toFixed(2);
	if (studentNum == 0) {
		submittedRate = 100.00;
	}
	if (submittedNum == 0) {
		markedRate = 100.00;
	}
	layui.use(["layer", "table"], function () {
		var layer = layui.layer;
		var table = layui.table;
		layer.open({
			type: 1, // page 层类型
			area: ["600px", "750px"],
			title: "班级提交情况",
			shade: 0.6, // 遮罩透明度
			shadeClose: true, // 点击遮罩区域，关闭弹层
			maxmin: true, // 允许全屏最小化
			anim: 0, // 0-6 的动画形式，-1 不开启
			content:
				"<br><div align='center'><span style='color:orange'>提交率：" +
				submittedNum +
				"/" +
				studentNum +
				"(" +
				submittedRate +
				"%)&emsp;</span><span style='color:green'>评分率：" +
				markedNum +
				"/" +
				submittedNum +
				"(" +
				markedRate +
				"%)</span></div><table id='statisticsTable'></table>",
			success: function () {
				table.render({
					elem: "#statisticsTable",
					data: data,
					cols: [
						[
							{ field: "name", title: "姓名", sort: true },
							{ field: "user_no", title: "学号", sort: true },
							{
								field: "status",
								title: "提交情况",
								sort: true,
								templet: function (d) {
									return d.status;
								}
							}
						]
					],
					initSort: {
						field: "user_no",
						type: "asc"
					}
				});
			}
		});
	});
}

// 添加排序事件监听器
function addSortEventListeners() {
	let sortButton = document.getElementsByClassName("dropdown-list dropdown-list-sorter")[0];
	let sortBy = sortButton.getElementsByTagName("li");
	for (let i = 0; i < sortBy.length; i++) {
		sortBy[i].addEventListener("click", function () {
			sleep(250).then(() => {
				waitElement(".list-item.row.collapse.ng-scope", showScoreInHomework);
			});
		});
	}

	let sortMethodButton = document.getElementsByClassName("dropdown-list sort-by-method")[0];
	let sortMethod = sortMethodButton.getElementsByTagName("li");
	for (let i = 0; i < sortMethod.length; i++) {
		sortMethod[i].addEventListener("click", function () {
			sleep(250).then(() => {
				waitElement(".list-item.row.collapse.ng-scope", showScoreInHomework);
			});
		});
	}
}

// 成绩页面显示成绩
function showScoreInScore() {
	getActivities().then((res) => {
		let activityForUser = res[0];
		let activities = res[1];
		let activityList = document.getElementsByClassName("activity row ng-scope");
		for (let i = 0; i < activityList.length; i++) {
			let originScoreElement = activityList[i].getElementsByClassName("operand large-10 columns zh-CN")[0].getElementsByTagName("span")[0];
			let name = activityList[i].getElementsByClassName("title ng-scope")[0].getElementsByTagName("a")[0].innerText;

			// find activityID
			let activityID;
			let averageScore;
			let highestScore;
			let lowestScore;

			for (let j = 0; j < activities.length; j++) {
				if (activities[j]["title"] == name) {
					activityID = activities[j]["id"];
					averageScore = activities[j]["average_score"];
					highestScore = activities[j]["highest_score"];
					lowestScore = activities[j]["lowest_score"];
					break;
				}
			}

			if (originScoreElement.className.includes("no-published")) {
				// find score
				let score;
				for (let j = 0; j < activityForUser.length; j++) {
					if (activityForUser[j]["activity_id"] == activityID) {
						score = activityForUser[j]["data"]["score"];
						break;
					}
				}

				// show score
				originScoreElement.style.color = "#ffc0cb";
				if (score != null) {
					originScoreElement.innerText = score;
				} else {
					originScoreElement.innerText = "未评分";
				}

				let actualScoreElement = originScoreElement.parentElement.parentElement.getElementsByClassName("operand large-10 columns zh-CN")[2].getElementsByTagName("span")[0];
				if (score != null) {
					actualScoreElement.innerText = ((score * parseFloat(originScoreElement.parentElement.parentElement.getElementsByClassName("operand large-10 columns zh-CN")[1].getElementsByTagName("span")[0].innerText)) / 100).toFixed(2);
				} else {
					actualScoreElement.innerText = "未评分";
				}
			}
			console.log("[Learning ZJU Helper] show score in score " + name + " success: score=" + originScoreElement.innerText);
		}
	});
}

(function () {
	"use strict";
	console.log("[Learning ZJU Helper] start");

	let layuiScript = document.createElement("script");
	layuiScript.src = "//unpkg.com/layui@2.8.17/dist/layui.js";
	document.body.appendChild(layuiScript);
	let layuiLink = document.createElement("link");
	layuiLink.rel = "stylesheet";
	layuiLink.href = "//unpkg.com/layui@2.8.17/dist/css/layui.css";
	document.body.appendChild(layuiLink);
	console.log("[Learning ZJU Helper] import layui success");

	let URLChangeCallback = function () {
		let url = new URL(window.location.href);
		let path = url.pathname;

		if (path.includes("homework")) {
			// 作业页面
			sleep(250).then(() => {
				getStatistics();
				waitElement(".list-item.row.collapse.ng-scope", addSortEventListeners);
				waitElement(".list-item.row.collapse.ng-scope", showScoreInHomework);
			});
		} else if (path.includes("score")) {
			// 成绩页面
			sleep(250).then(() => {
				waitElement(".activity.row.ng-scope", showScoreInScore);
			});
		}
	};
	URLChangeCallback();
	window.onload = observeURLChange(URLChangeCallback);
	window.addEventListener("hashchange", function (event) {
		URLChangeCallback();
	});
})();
