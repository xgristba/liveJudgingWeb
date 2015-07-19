'use strict';

angular.module('liveJudgingAdmin.event', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/eventLoading', {
		templateUrl: 'modules/event/eventLoading.html',
		controller: 'EventLoadingCtrl'
	}).when('/event', {
		templateUrl: 'modules/event/event.html',
		controller: 'EventCtrl'
	}).when('/eventSelect', {
		templateUrl: 'modules/event/eventSelect.html',
		controller: 'EventSelectCtrl'
	}).when('/eventEdit', {
		templateUrl: 'modules/event/eventEdit.html',
		controller: 'EventEditCtrl'
	});
}])

.run(['EventUtilService', 'sessionStorage', function(EventUtilService, sessionStorage) {
	if (EventUtilService.isEventRunning(sessionStorage.getObject('selected_event'))) {
		sessionStorage.put('event_view', EventUtilService.views.EVENT_IN_PROGRESS_VIEW);
	} else {
		sessionStorage.put('event_view', EventUtilService.views.EVENT_READY_VIEW);
	}
}])

.controller('EventSelectCtrl', ['sessionStorage', '$location', '$scope', 'CurrentUserService', 'EventRESTService', 'EventUtilService',
	function(sessionStorage, $location, $scope, CurrentUserService, EventRESTService, EventUtilService) {
		EventRESTService(CurrentUserService.getAuthHeader()).events.get().$promise.then(function(resp) {
			console.log('Events successfully retrieved from server.');
			$scope.eventList = resp;
		}).catch(function(error) {
			sessionStorage.putObject('generalErrorMessage', 'Error getting events from server.');
			console.log('Error getting events from server.');
		});

		$scope.showCreateEventForm = function() {
			sessionStorage.remove('selected_event');
			$location.path('/eventEdit');
		}

		$scope.selectEvent = function(event) {
			sessionStorage.clearAllButUser();
			sessionStorage.putObject('selected_event', event);
			if (EventUtilService.isEventRunning(event)) {
				EventUtilService.setEventView(EventUtilService.views.EVENT_IN_PROGRESS_VIEW);
			} else {
				EventUtilService.setEventView(EventUtilService.views.EVENT_READY_VIEW);
			}
      $location.path('/eventLoading');
		};
	}
])

.controller('EventEditCtrl', ['sessionStorage', '$filter', '$location', '$scope', 'CurrentUserService', 'EventRESTService',   
                              'EventUtilService',
	function(sessionStorage, $filter, $location, $scope, CurrentUserService, EventRESTService, EventUtilService) {
		$scope.isCreation = sessionStorage.getObject('selected_event') ? false : true;

		$scope.datePicker = {
			startOpened: false,
			endOpened: false
		};

		$scope.eventForm = {
			startTime: new Date(0, 0, 0, 12, 0),
			endTime: new Date(0, 0, 0, 12, 0),
      minDate: Date.now()
		};
    
    $scope.eventForm.isMultiDay = false;
    
		$scope.saveEvent = function(eventForm) {
			addDateTimesToEvent(eventForm);

			var eventReq = {
				name: eventForm.name,
				location: eventForm.location,
				start_time: eventForm.startDateTime,
				end_time: eventForm.endDateTime
			}

			if ($scope.isCreation) {
				EventRESTService(CurrentUserService.getAuthHeader()).events.create(eventReq).$promise.then(function(resp) {
					sessionStorage.putObject('selected_event', resp);
					EventUtilService.setEventView(EventUtilService.views.EVENT_READY_VIEW);
					$location.path('/event');
				}).catch(function() {
					$scope.errorMessage = 'Error creating event.';
					console.log($scope.errorMessage);
				});
			} else {
				var eventId = sessionStorage.getObject('selected_event').id;
				EventRESTService(CurrentUserService.getAuthHeader()).event.update({id: eventId}, eventReq)
          .$promise.then(function(resp) {
					sessionStorage.putObject('selected_event', resp);
					$location.path('/event');
				}).catch(function() {
					$scope.errorMessage = 'Error updating event.';
					console.log($scope.errorMessage);
				});
			}
		};

		$scope.cancel = function() {
			if ($scope.isCreation) {
				$location.path('/eventSelect');
			} else {
				$location.path('/event');
			}
		};

		var resetEventForm = function(event) {
			$scope.eventForm = null;
			$scope.eventForm = {
				startTime: new Date(0, 0, 0, 12, 0),
				endTime: new Date(0, 0, 0, 12, 0),
        minDate: Date.now()
			};
		};

		var loadEventForm = function(event) {
			$scope.eventForm = {
				name: event.name,
				location: event.location,
        minDate: Date.now()
			};
			addDateTimesToForm(event);
		};

		// Takes the event JSON times (returned by the server) and
		// puts them into the event edit form controls.
		var addDateTimesToForm = function(event) {
			var start = new Date(Date.parse(event.start_time));
			var end = new Date(Date.parse(event.end_time));

			$scope.eventForm.startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
			$scope.eventForm.endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      $scope.eventForm.isMultiDay = false;
			$scope.eventForm.startTime = new Date(0, 0, 0, start.getHours(), start.getMinutes(), 0);
			$scope.eventForm.endTime = new Date(0, 0, 0, end.getHours(), end.getMinutes(), 0);
		};

		// Takes the data in event edit form controls
		// and translates them to a format that the server read.
		var addDateTimesToEvent = function(eventForm) {
			var startDate = eventForm.startDate;
			var endDate = (eventForm.isMultiDay && eventForm.endDate) ? eventForm.endDate : startDate;
			var startTime = eventForm.startTime;
			var endTime = eventForm.endTime;

			var startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(),
										 startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
			var endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(),
									   endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());

			eventForm.startDateTime = $filter('date')(startDateTime, 'yyyy-MM-dd HH:mm:ss');
			eventForm.endDateTime = $filter('date')(endDateTime, 'yyyy-MM-dd HH:mm:ss');
		};

		$scope.toggleDatePicker = function($event, picker) {
			$event.preventDefault();
			$event.stopPropagation();

			if (picker === 'start') {
				$scope.datePicker.startOpened = !$scope.datePicker.startOpened;
			} else if (picker === 'end') {
				$scope.datePicker.endOpened = !$scope.datePicker.endOpened;
			}
		}

		if ($scope.isCreation) {
			resetEventForm();
		} else {
			loadEventForm(sessionStorage.getObject('selected_event'));
		}
    
    $scope.$watch(function() {
      return $scope.eventForm.startDate;
    }, function(startDate) {
      if (startDate > $scope.eventForm.endDate || $scope.eventForm.endDate === undefined)
        $scope.eventForm.endDate = startDate;
      if ($scope.isMultiDay)
        compareEndTimeAndDateToNow($scope.eventForm.endDate, 
                                   $scope.eventForm.endTime);
      else
        compareEndTimeAndDateToNow($scope.eventForm.startDate, 
                                   $scope.eventForm.endTime);
    });

    $scope.$watch(function() {
      return $scope.eventForm.endDate;
    }, function(endDate) {
      if (endDate < $scope.eventForm.startDate) 
        $scope.eventForm.startDate = endDate;
      if ($scope.isMultiDay)
        compareEndTimeAndDateToNow($scope.eventForm.endDate, 
                                   $scope.eventForm.endTime);
      else
        compareEndTimeAndDateToNow($scope.eventForm.startDate, 
                                   $scope.eventForm.endTime);
    });

    $scope.$watch(function() {
      return $scope.eventForm.startTime;
    }, function(startTime) {
      if (startTime > $scope.eventForm.endTime) 
        $scope.eventForm.endTime = startTime;
      if ($scope.isMultiDay)
        compareEndTimeAndDateToNow($scope.eventForm.endDate, 
                                   $scope.eventForm.endTime);
      else
        compareEndTimeAndDateToNow($scope.eventForm.startDate, 
                                   $scope.eventForm.endTime);
    });

    $scope.$watch(function() {
      return $scope.eventForm.endTime;
    }, function(endTime) {
      if (endTime < $scope.eventForm.startTime) 
        $scope.eventForm.startTime = endTime;
      if ($scope.isMultiDay)
        compareEndTimeAndDateToNow($scope.eventForm.endDate, 
                                   $scope.eventForm.endTime);
      else
        compareEndTimeAndDateToNow($scope.eventForm.startDate, 
                                   $scope.eventForm.endTime);
    });

    var compareEndTimeAndDateToNow = function(endDate, endTime) {
      if (!endDate || !endTime) {
        $scope.invalidDateTime = true;
        return;
      }
      var endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(),
                                 endTime.getHours(), endTime.getMinutes(), endTime.getSeconds()); 
      if (Date.now() > endDateTime) 
        $scope.invalidDateTime = true;
      else
        $scope.invalidDateTime = false;
    }
	}
])

.controller('EventCtrl', ['sessionStorage', '$filter', '$location', '$rootScope', '$scope', 'CategoryManagementService', 'CurrentUserService', 'EventRESTService', 'EventUtilService', 'TeamRESTService', 'TeamStandingService',
	function(sessionStorage, $filter, $location, $rootScope, $scope, CategoryManagementService, CurrentUserService, EventRESTService, EventUtilService,
						 TeamRESTService, TeamStandingService) {
		var teamStandingService = TeamStandingService($scope);
		teamStandingService.init();

		var categoryManagementService = CategoryManagementService($scope);

		$scope.event = {
			EVENT_READY_VIEW: EventUtilService.views.EVENT_READY_VIEW,
			EVENT_IN_PROGRESS_VIEW: EventUtilService.views.EVENT_IN_PROGRESS_VIEW,
			current_view: sessionStorage.get('event_view')
		};

    $scope.eventTabs = [{name: 'Judge Progress', id: 'judge-progress-tab', sectionId: 'judge-progress-section'},
                        {name: 'Team Progress', id: 'team-progress-tab', sectionId: 'team-progress-section'},
                        {name: 'Team Standing', id: 'team-standing-tab', sectionId: 'team-standing-section'}];
    
		$scope.getSelectedEvent = function() {
			return sessionStorage.getObject('selected_event');
		};

		$scope.isEventRunning = function() {
			return EventUtilService.isEventRunning();
		};

		$scope.editEvent = function() {
			$location.path('/eventEdit');
		};

		$scope.beginEvent = function() {
			var curEvent = sessionStorage.getObject('selected_event');
			var eventId = curEvent.id;
			var eventDuration = Date.parse(curEvent.end_time) - Date.parse(curEvent.start_time);
			var newStartTime = Date.now();
			var newEndTime = newStartTime + eventDuration;

			var updatedEvent = {
					name: curEvent.name,
					start_time: $filter('date')(newStartTime, 'yyyy-MM-dd HH:mm:ss'),
					end_time: $filter('date')(newEndTime, 'yyyy-MM-dd HH:mm:ss'),
					location: curEvent.location
			};
      
			EventRESTService(CurrentUserService.getAuthHeader()).event.update({id: eventId}, 
                                                                        updatedEvent)
        .$promise.then(function(resp) {
				sessionStorage.putObject('selected_event', resp);
				var view = EventUtilService.views.EVENT_IN_PROGRESS_VIEW;
				sessionStorage.put('event_view', view);
				$scope.event.current_view = view;
				console.log("Event started.");
			}).catch(function() {
				console.log('Error updating event times.');
			});
		};

		$scope.reveal_event_desc = function(desc) {
			$('#event-selection-desc').html('<strong>Event Description:</strong><br />' + desc).show();
		};

				$scope.rankNext3Categories = function() {
					var categoryInc = parseInt(sessionStorage.get('categoryInc')) + 3;
					var numCategories = $scope.teamStanding.length;
					if (categoryInc > numCategories)
						sessionStorage.put('categoryInc', 0);
					else
						sessionStorage.put('categoryInc', categoryInc);
				}

				$scope.recipientList = []; // Contains list of judges to be notified

		$scope.initRecipientList = function(item, type) {
		  if (type === 'judge') {
			$scope.$broadcast('firstRecipientsAdded', item.judge.name);
		  } else if (type === 'team') {
			var judgeIds = item.judges;
			var judgeObjs = sessionStorage.getObject('judges');
			var judgeNames = [];
			if (judgeObjs) {
			  for (var i = 0; i < judgeIds.length; i++) {
				var judgeId = judgeIds[i].id;
				for (var j = 0; j < judgeObjs.length; j++) {
				  if (judgeObjs[i].id === judgeId) {
					judgeNames.push(judgeObjs[i].judge.name);
					break;
				  }
				}
			  }
			  $scope.$broadcast('firstRecipientsAdded', judgeNames);
			}
		  }
		}

		$scope.$on('$locationChangeStart', function(event, next, current) {
			if ($location.path() !== '/event') {
				// Decides whether an event is in progress or not whenever /event is hit.
				if (EventUtilService.isEventRunning(sessionStorage.getObject('selected_event'))) {
					var view = EventUtilService.views.EVENT_IN_PROGRESS_VIEW;
				} else {
					var view = EventUtilService.views.EVENT_READY_VIEW;
				}
				sessionStorage.put('event_view', view);
				$scope.event.current_view = view;
			}
		});

		/** DASHBOARD RELATED **/
		$scope.judgeOrderReverse = true;
		$scope.judgeAssignmentCount = 0;
		$scope.judgeCompletedCount = 0;

		$scope.orderByCompletion = function(judgeJudgment) {
			return parseInt(judgeJudgment.completion);
		}

		$scope.determineOverallJudgeProgress = function(judgeJudgments) {
			if (!judgeJudgments) {
				return [null, null, null];
			}
			var teamCount = 0;
			var completedTeamCount = 0;
			for (var i = 0; i < judgeJudgments.length; i++) {
				for (var j = 0; j < judgeJudgments[i].judgments.length; j++) {
					if (judgeJudgments[i].judgments[j].completed) {
						completedTeamCount++;
					}
				}
				teamCount += judgeJudgments[i].judgments.length;
				teamCount += judgeJudgments[i].theUnjudged.length;
			}
			$scope.judgeAssignmentCount = teamCount;
			$scope.judgeCompletedCount = completedTeamCount;
			return [completedTeamCount, teamCount, Math.floor(completedTeamCount/teamCount * 100)];
		}

		$scope.convertColorToHex = function(decimalColor) {
			return categoryManagementService.convertColorToHex(decimalColor);
		}
	}
])

.controller('EventLoadingCtrl', ['$q', '$scope', '$location', '$timeout', 'sessionStorage', 'JudgeManagementService', 
                                 'TeamManagementService', 'TeamStandingService',
	function($q, $scope, $location, $timeout, sessionStorage, JudgeManagementService, 
            TeamManagmentService, TeamStandingService) {
  
    var teamManagmentService = TeamManagmentService($scope, sessionStorage);
    var judgeManagementService = JudgeManagementService($scope, sessionStorage);
    var teamStandingService = TeamStandingService($scope);

    $scope.getEverything = function() {
      var masterDefer = $q.defer();
      
      $timeout(function() {
        masterDefer.reject();
        //TODO: raise alert if loading timeout occurs--something went wrong
      }, 60000);
      
      teamManagmentService.getTeams().then(function(resp) {
        teamManagmentService.getTeamsCategories(resp).then(function() {
          teamStandingService.getJudgmentsOfAllTeams();
          judgeManagementService.getJudges().then(function() {
            teamStandingService.getJudgmentsByAllJudges().then(function(resp) {
                sessionStorage.putObject('judgeJudgments', resp);
                teamStandingService.determineTeamStanding(resp);
                masterDefer.resolve();
            });
          });
        });
      }).catch(function(error) {
        masterDefer.reject();
      });

      return masterDefer.promise;
    }
  
    $scope.getEverything().then(function() {
      $location.path('/event');
    }).catch(function(error) {
      $location.path('/eventSelect');
    });
}])


.factory('TeamStandingService', ['$q', 'sessionStorage', 'CategoryManagementService', 'CurrentUserService', 
                                 'JudgeManagementService', 'JudgeRESTService', 'JudgmentRESTService', 'RubricRESTService', 
                                 'TeamManagementService', '$location',
	function($q, sessionStorage, CategoryManagementService, CurrentUserService, JudgeManagementService, JudgeRESTService, 
            JudgmentRESTService, RubricRESTService, TeamManagmentService, $location) {
	return function($scope) {
		var authHeader = CurrentUserService.getAuthHeader();

		var service = {};

		service.init =  function() {
				var authHeader = CurrentUserService.getAuthHeader();
				var eventId = sessionStorage.getObject('selected_event').id;

				var categoryManagementService = CategoryManagementService($scope);
				categoryManagementService.getCategories();

				var teamManagmentService = TeamManagmentService($scope, sessionStorage);
				var judgeManagementService = JudgeManagementService($scope, sessionStorage);

				$scope.$watch(function() {
					return sessionStorage.getObject('categories');
				}, function(newValue) {
					$scope.categories = newValue;
				}, true);

				$scope.$watch(function() {
						return sessionStorage.getObject('teams');
				}, function(newValue) {
						$scope.teams = newValue;
				}, true);

				$scope.$watch(function() {
						return sessionStorage.getObject('judges');
				}, function(newValue) {
						$scope.judges = newValue;
				}, true);

				$scope.$watch(function() {
						return sessionStorage.getObject('selected_event');
				}, function(newValue) {
						$scope.selectedEvent = newValue;
				}, true);

				$scope.$watch(function() {
						return sessionStorage.getObject('judgeJudgments');
				}, function(newValue) {
						$scope.judgeJudgments = newValue;
				}, true);

				$scope.$watch(function() {
						return sessionStorage.getObject('teamStanding');
				}, function(newValue) {
						$scope.teamStanding = newValue;
				}, true);

				sessionStorage.put('categoryInc', '0');
		}

		/* THIS CODE IS A MONUMENT TO MY SINS.
		   Dear anyone who wants to improve upon Live Judging Web:
		   Do yourself a favor and rewrite this entire service. It
		   is extremely, EXTREMELY awful & I hate it.
		   Luv, Christina K */

		service.determineTeamStanding = function(jJudgments) {
			var teamStanding = [];
			var seenCats = [];
			for (var i = 0; i < jJudgments.length; i++) {
				for (var j = 0; j < jJudgments[i].judgments.length; j++) {
					var judgment = jJudgments[i].judgments[j];
					if (seenCats.indexOf(judgment.category.id) == -1) {
						seenCats.push(judgment.category.id);
						teamStanding.push({
							category: judgment.category,
							teams: []
						});
						teamStanding[teamStanding.length - 1]
							.teams.push({team: judgment.team,
										teamPercentScore: judgment.percentScore,
										teamJudgmentsCount: 1});
					} else {
						var help = 'me';
						var foundTeam;
						for (var k = 0; k < teamStanding.length; k++) {
							foundTeam = false;
							if (teamStanding[k].category.id == judgment.category.id) {
								for (var l = 0; l < teamStanding[k].teams.length; l++) {
									if (teamStanding[k].teams[l].team.id == judgment.team.id) {
										foundTeam = true;
										teamStanding[k].teams[l].teamPercentScore += judgment.percentScore;
										teamStanding[k].teams[l].teamJudgmentsCount++;
									}
								}
								if (!foundTeam) {
									teamStanding[k].teams
										.push({team: judgment.team,
												teamPercentScore: judgment.percentScore,
												teamJudgmentsCount: 1});
								}
							}
						}
					}
				}
			}
			for (var i = 0; i < teamStanding.length; i++) {
				for (var j = 0; j < teamStanding[i].teams.length; j++) {
					teamStanding[i].teams[j].teamPercentScore = teamStanding[i].teams[j].teamPercentScore / teamStanding[i].teams[j].teamJudgmentsCount;
				}
			}
			sessionStorage.putObject('teamStanding', teamStanding);
		}

		service.getJudgmentsByAllJudges = function() {
			var defer = $q.defer();

			var judges = sessionStorage.getObject('judges');
			var eventId = sessionStorage.getObject('selected_event').id;
			var promises = [];
			for (var i = 0; i < judges.length; i++) {
				promises.push(service.getJudgmentsByJudge(eventId, judges[i]));
			}

			$q.all(promises).then(function(resp) {
				console.log(resp);
				defer.resolve(resp);
			}).catch(function() {
				defer.reject();
        var error = 'Error getting judgments by judge Ids.';
        sessionStorage.put('generalErrorMessage', error);
				console.log('Error getting judgments by judge ids.');
			});

			return defer.promise;
		}

		service.getJudgmentsByJudge = function(eventId, judgeObj) {
			var defer = $q.defer();
			JudgmentRESTService(authHeader).judgments.getByJudge({event_id: eventId, judge_id: judgeObj.id}).$promise.then(function(resp) {
				service.addTeamsToJudgments(resp).then(function(resp2) {
					service.determineCompletedTeamsByJudge(judgeObj.id, resp2).then(function(resp3) { //great variable naming skills
						service.determineUnstartedTeamsByJudge(judgeObj.id, resp3).then(function(resp4) {
							var completedTeamCount = 0;
							for (var i = 0; i < resp3.length; i++) {
								if (resp3[i].completed) {
									completedTeamCount++;
								}
							}
							var assignedTeamsCount = resp3.length + resp4.length;
							var percentCompleted = Math.floor((completedTeamCount / assignedTeamsCount) * 100);
							var judgeJudgments = {
								judge: judgeObj.judge,
								judgments: resp3,
								theUnjudged: resp4,
								completion: isNaN(percentCompleted) ? 0 : percentCompleted,
								numCompletedTeams: completedTeamCount,
								numAssignedTeams: assignedTeamsCount
							};
							defer.resolve(judgeJudgments);
						})
					});
				});
			}).catch(function() {
				defer.reject();
			});

			return defer.promise;
		}

		service.addTeamsToJudgments = function(judgments) {
			var defer = $q.defer();

			if (judgments.length == 0) {
				defer.resolve([]);
			} else {
				var teamCatPromises = [];
				var seenTeamCats = [];

				for (var i = 0; i < judgments.length; i++) {
					teamCatPromises.push(addTeamToJudgment(judgments[i]));
				}

				$q.all(teamCatPromises).then(function(resp) {
					defer.resolve(resp);
				}).catch(function() {
					console.log('Error adding team & cat ids to judgments');
				});
			}

			return defer.promise;

			function addTeamToJudgment(judgment) {
				var defer = $q.defer();

				var judgmentWithTeam = judgment;

				var teamCats = sessionStorage.getObject('teamsCategories');
				for (var i = 0; i < teamCats.length; i++) {
					for (var j = 0; j < teamCats[i].length; j++) {
						if (judgmentWithTeam.team_category.id == teamCats[i][j].id) {
							judgmentWithTeam.team = teamCats[i][j].team;
							judgmentWithTeam.category = teamCats[i][j].category;
							break;
						}
					}
				}
				defer.resolve(judgmentWithTeam);

				return defer.promise;
			}

		}

		service.determineCompletedTeamsByJudge = function(id, judgments) {
			// IMPORTANT: Here, 'judgment' refers to an overall judgment
			// of a team (all criteria considered)
			var defer = $q.defer();

			if (judgments.length == 0) {
				defer.resolve([]);
			} else {
				var rubricRESTService = RubricRESTService(authHeader);

				var promises = [];
				// Makes a mapping of rubric Ids to number of criteria in the rubric.
				// Used to determine whether a judge has completed judging a specific team.
				var seenRubrics = [];
				for (var i = 0; i < judgments.length; i++) {
					if (seenRubrics.indexOf(judgments[i].rubric.id) == -1) {
						seenRubrics.push(judgments[i].rubric.id);
						promises.push(getNumCriteriaInRubric(judgments[i].rubric.id));
					}
				}

				$q.all(promises).then(function(rubricNumCriteriaMapping) {
					var judgedTeams = [];
					var seenTeams = [];
					for (var i = 0; i < judgments.length; i++) {
						var index = seenTeams.indexOf(judgments[i].team.id);
						if (index != -1) { // Counting the number of judged criteria, & checking if it equals the total.
							for (var j = 0; j < judgedTeams.length; j++) {
								if (judgedTeams[j].team.id == judgments[i].team.id) {
									judgedTeams[j].submitedCriteria++;
									judgedTeams[j].percentScore = (judgedTeams[j].percentScore + (judgments[i].value/judgments[i].criterion.max_score));
									if (judgedTeams[j].submitedCriteria == judgedTeams[j].totalCriteria) {
										judgedTeams[j].completed = true;
									}
								}
							}
						} else {
							seenTeams.push(judgments[i].team.id);
							var numCriteria;
							for (var j = 0; j < rubricNumCriteriaMapping.length; j++) {
								if (judgments[i].rubric.id == rubricNumCriteriaMapping[j].rubricId) {
									numCriteria = rubricNumCriteriaMapping[j].numCriteria;
								}
							}
							judgedTeams.push({
								completed: false,
								submitedCriteria: 1,
								totalCriteria: numCriteria,
								percentScore: judgments[i].value/judgments[i].criterion.max_score,
								team: judgments[i].team,
								category: judgments[i].category,
								judgeId: judgments[i].judge.id
							});
						}
					}
					for (var i = 0; i < judgedTeams.length; i++) {
						judgedTeams[i].percentScore = judgedTeams[i].percentScore / judgedTeams[i].submitedCriteria;
					}
					defer.resolve(judgedTeams);
				});
			}

			return defer.promise;

			function getNumCriteriaInRubric(rId, rubricNumCriteriaMapping) {
				var defer = $q.defer();
				rubricRESTService.rubric.get({id: rId}).$promise.then(function(resp) {
					defer.resolve({rubricId: rId, numCriteria: resp.criteria.length});
				}).catch(function() {
					defer.reject();
					console.log('Error getting rubric');
				});

				return defer.promise;
			}

			/**/
		}

		service.determineUnstartedTeamsByJudge = function(judgeId, judgeJudgments) {
			var defer = $q.defer();

			var judges = sessionStorage.getObject('judges');
			for (var i = 0; i < judges.length; i++) {
				if (judges[i].id == judgeId) {
					var judge = judges[i];
					break;
				}
			}
			JudgeRESTService(authHeader).judgeTeams.get({judge_id: judgeId}).$promise.then(function(resp) {
				var assignedTeams = [];
				for (var i = 0; i < resp.length; i++) {
					assignedTeams.push(resp[i].team);
				}
				if (judgeJudgments.length == 0) {
					defer.resolve(assignedTeams);
				} else {
					for (var i = 0; i < judgeJudgments.length; i++) {
						for (var j = 0; j < assignedTeams.length; j++) {
							if (judgeJudgments[i].team.id == assignedTeams[j].id) {
								assignedTeams.splice(j, 1);
							}
						}
					}
					var theUnjudged = [];
					for (var i = 0; i < assignedTeams.length; i++) {
						theUnjudged.push(assignedTeams[i]);
					}
					defer.resolve(theUnjudged);
				}
			});

			return defer.promise;
		}

		service.getJudgmentsOfAllTeams = function() {
			var defer = $q.defer();

			var teams = sessionStorage.getObject('teams');
			var eventId = sessionStorage.getObject('selected_event').id;
			var promises = [];
			for (var i = 0; i < teams.length; i++) {
				promises.push(service.getJudgmentsOfTeam(eventId, teams[i].id));
			}

			$q.all(promises).then(function(resp) {
				defer.resolve(resp);
			}).catch(function() {
				defer.reject();
				console.log('Error getting judgments by team ids');
			});

			return defer.promise;
		}

		service.getJudgmentsOfTeam = function(eventId, teamId) {
			var defer = $q.defer();
			JudgmentRESTService(authHeader).judgments.getByTeam({event_id: eventId, team_id: teamId}).$promise.then(function(resp) {
				defer.resolve(resp);
			}).catch(function() {
				defer.reject();
			});

			return defer.promise;
		}

			return service;
	}
}])

.factory('EventUtilService', function(sessionStorage) {
	var service = {
		views: {
			EVENT_EDIT_VIEW: "event_edit_view",
			EVENT_READY_VIEW: "event_ready_view",
			EVENT_IN_PROGRESS_VIEW: "event_in_progress_view",
		},
		getEventView: function() {
			sessionStorage.get('event_view');
		},
		setEventView: function(view) {
			sessionStorage.put('event_view', view);
		},
		isEventRunning: function() {
			var event = sessionStorage.getObject('selected_event');
			if (event) {
				var startDateTime = Date.parse(event.start_time);
				var endDateTime = Date.parse(event.end_time);
				if (startDateTime <= Date.now() && endDateTime >= Date.now()) {
					sessionStorage.put("event" + event.id + "_running", "true");
					return true;
				} else {
					return false;
				}
			}
      return false;
		}
	};

	return service;
})

.factory('EventRESTService', function($resource, CurrentUserService) {
	return function(authHeader) {
		return {
			events: $resource('http://api.stevedolan.me/events', {}, {
				create: {
					method: 'POST',
					headers: authHeader
				},
				get: {
					method: 'GET',
					isArray: true,
					headers: authHeader
				}
			}),
			event: $resource('http://api.stevedolan.me/events/:id', {
				id: '@id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				update: {
					method: 'PUT',
					headers: authHeader
				}
			})
		}
	}
})

.factory('JudgmentRESTService', function($resource) {
	return function(authHeader) {
		return {
			judgments: $resource('http://api.stevedolan.me/events/:event_id/judgments', {
				event_id: '@id'
			}, {
				get: {
					method: 'GET',
					isArray: true,
					headers: authHeader
				},
				getByJudge: {
					method: 'GET',
					params: {judge_id: '@judgeId'},
					isArray: true,
					headers: authHeader
				},
				getByTeam: {
					method: 'GET',
					params: {team_id: '@teamId'},
					isArray: true,
					headers: authHeader
				}
			})
		}
	}
})

.factory('MessageRESTService', function($resource) {
	return function(authHeader) {
		return {
			messages: $resource('http://api.stevedolan.me/messages', {
				recipient_id: '@recipientId',
				subject: '@subject',
				body: '@body'
			}, {
				send: {
					method: 'POST',
					headers: authHeader
				}
			})
		}
	}
})

.filter('formatTab', function() {
	return function(tab) {
		var tabParts = tab.split('-');
		var tabName = tabParts[0] + ' ' + tabParts[1];
		tabName = tabName.toLocaleUpperCase();
		return tabName;
	}
})

.filter('filter3Categories', ['sessionStorage', function(sessionStorage) {
	return function(items) {
		return items.filter(function(element, index, array) {
			var start = parseInt(sessionStorage.get('categoryInc'));
			var end = start + 3;
			return index >= start && index < end;
		});
	}
}])

.directive('cngEventTab', function() {
	var link = function(scope, elem, attrs) {
		elem.bind('click', function() {
			var eventTabs = elem.parent().find('li');
			eventTabs.each(function() {
				if ($(this).hasClass('active')) {
					$(this).removeClass('active');
					var eventSection = '#' + $(this).attr('event-section');
					$(eventSection).hide();
				}
			});
			$(this).addClass('active');
			var eventSection = '#' + scope.eventSection;
			$(eventSection).show();
		});
	}
	return {
		restrict: 'A',
		scope: {
			eventSection: '@'
	  },
		link: link
	};
})

.directive('expandAllAccordions', function() {
  return {
	link: function(scope, elem, attrs) {
			$('.expand-all-accordions.judge').unbind().click(function() {
				var judgeAccordion = $('.judge-accordion');
		judgeAccordion.find('.accordion-body').collapse('show');
				judgeAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
	  });
	  $('.expand-all-accordions.team').unbind().click(function() {
		var teamAccordion = $('.team-accordion');
		teamAccordion.find('.accordion-body').collapse('show');
				teamAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
	  });
	  $('.expand-all-accordions.category').unbind().click(function() {
		var catAccordion = $('.category-accordion');
		catAccordion.find('.accordion-body').collapse('show');
				catAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
	  });
	}
  }
})

.directive('collapseAllAccordions', function() {
  return {
	link: function(scope, elem, attrs) {
	  $('.collapse-all-accordions.judge').unbind().click(function() {
				var judgeAccordion = $('.judge-accordion');
		judgeAccordion.find('.accordion-body').collapse('hide');
				judgeAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
	  });
	  $('.collapse-all-accordions.team').unbind().click(function() {
		var teamAccordion = $('.team-accordion');
		teamAccordion.find('.accordion-body').collapse('hide');
				teamAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
	  });
	  $('.collapse-all-accordions.category').unbind().click(function() {
		var catAccordion = $('.category-accordion');
		catAccordion.find('.accordion-body').collapse('hide');
				catAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
	  });
	}
  }
})

.directive('notificationModal', ['sessionStorage', function(sessionStorage) {

	var link = function(scope, elem, attrs) {
		scope.$watch(function() {
		  return sessionStorage.getObject('judges');   
		}, function(newJudgeList) {
		  if (newJudgeList) { 
						scope.judges = newJudgeList;
			updateAutoComplete();
					}
		}, true);
			
    scope.$on('firstRecipientsAdded', function (event, data) {
      if (data) {
        if ($.isArray(data)) {
          angular.forEach(data, function(entry) {
          create_new_judge_notification_object(entry); 
          });
        } else if (typeof data === 'string') {
          create_new_judge_notification_object(data); 
        }
      }
		});

    /*
		 * Initialize the Autocomplete Object for the Notification Modal
		 */
		var updateAutoComplete = function() {
					var input = $('#judge-search');
		  var judgeNames = parseJudgeNames();
					
					if (input.data('ui-autocomplete') === undefined) {
						input.autocomplete({
								source: judgeNames,
								select: function(event, ui) {
										var recipient_name = ui.item.value;
										if (jQuery.inArray(recipient_name, scope.recipientList) === -1) {
												create_new_judge_notification_object(recipient_name);
										}
										$(this).val(''); // Clear input after selecting judge
										event.preventDefault();
								}
						});
					} else {
							input.autocomplete('option', 'source', judgeNames); // Update autocomplete source	
					}
		}
		
		var parseJudgeNames = function() {
		  var judgeNames = [];
		  angular.forEach(scope.judges, function(judgeObj) {
			judgeNames.push(judgeObj.judge.name);
		  });
		  return judgeNames;
		}

		/*
		 * Append an interactive DOM object above the Autocomplete Search Bar
		 */
		function create_new_judge_notification_object(name) {
						scope.recipientList.push(name);
			var recipient_div = $("#recipients-div");
			recipient_div.append("<div class='recipient'>" + name +
				"&nbsp;&nbsp;<span class='glyphicon glyphicon-remove'></span></div>");
			clear_all_checkbox.attr("checked", false);
			/* Add listener to dynamically created HTML element */
			$(".recipient .glyphicon.glyphicon-remove").click(function() {
				if ($(this).parent().html().indexOf(name) >= 0) {
					/* Remove recipient from list if 'x' is clicked */
					scope.recipientList = scope.recipientList.filter(function(elem) {
												return elem != name;
					});
					/* Destroy HTML element */
					$(this).parent().remove();
					send_all_checkbox.attr("checked", false);
				}
			});
		}

		/*
		 * Send to all judges Checkbox
		 */
		var send_all_checkbox = $("#send-all-checkbox");
		send_all_checkbox.click(function() {
			if (!this.checked) return;
			for (var i = 0; i < scope.judges.length; i++) {
				var name = scope.judges[i].judge.name;
				if (jQuery.inArray(name, scope.recipientList) === -1)
					create_new_judge_notification_object(name);
			}
			clear_all_checkbox.attr("checked", false);
		});

		/*
		 * Clear all judges from receiving notification Checkbox
		 */
		var clear_all_checkbox = $("#clear-all-checkbox");
		clear_all_checkbox.click(function() {
			if (!this.checked) return;
			/* Use listener defined in create_new_judge_notification_object() to destroy */
			$(".recipient .glyphicon.glyphicon-remove").click();
			scope.recipientList.length = 0; // Clear recipient list
			send_all_checkbox.attr("checked", false);
		});
				
				// Clear recipient objects upon modal close
				elem.find('#cancel-notification-btn').click(function() {
					clear_all_checkbox.click();
					scope.recipientList = [];
				});
	}

  return {
	restrict: 'A',
		scope: {
			recipientList: '='
		},
	link: link
  };
}])

.directive('dateWidget', function() {
	return {
		link: function(scope, elm, attrs) {
			$("#datepicker-start").datepicker();
			$("#datepicker-end").datepicker();
		}
  };
})

.directive('multiDayEventWidget', function() {
	return {
		link: function(scope, elem, attrs) {
			$("#multi-day-event-checkbox").click(function() {
				var optional_date_div = $("#end-date-optional");
				if (this.checked) {
					optional_date_div.show();
				} else {
					optional_date_div.hide();
				}
			});
		}
	};
});



