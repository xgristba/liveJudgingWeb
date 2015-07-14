'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$q', '$scope', 'sessionStorage', '$log', 'filterFilter', 'JudgeManagementService', 'JudgeWatchService',
	function($q, $scope, sessionStorage, $log, filterFilter, JudgeManagementService, JudgeWatchService) {

	var judgeWatchService = JudgeWatchService($scope, sessionStorage);
	judgeWatchService.init();

	var judgeManagementService = JudgeManagementService($scope, sessionStorage);
	judgeManagementService.getJudges();

	/* Judge Modal Variables */
	$scope.judgeModalView = 'create';
	$scope.judgeModalTab = 'judgeInfo';
	$scope.modalSortType = '+name';
	$scope.teamFilterText = '';

	$scope.judgeId;
	$scope.judgeInfoForm = {};

	$scope.teamsToAdd = []; // Teams added in the form (not yet saved)
	$scope.teamsToRemove = []; // Teams removed in the form (not yet saved)
	$scope.assignedTeams = []; // Teams actually assigned
	/* end */

	$scope.tabs = [
		{ title: 'Judge Information', active: true, view: 'judgeInfo' },
		{ title: 'Assigned Teams', view: 'teams' },
		{ title: 'Criteria Rules', view: 'criteria' }
	];

	$scope.changeView = function(view) {
		judgeManagementService.changeView(view);
	}

	$scope.getTeam = function(attr, value) {
		for (var i = 0; i < $scope.teams.length; i++)
			if ($scope.teams[i][attr] === value)
				return $scope.teams[i];
	}

	$scope.changeModalTab = function(tab) {
		$scope.judgeModalTab = tab;
	}

	$scope.changeModalSortType = function(type) {
		if (type === 'name' || type === 'id')
			$scope.modalSortType = '+' + type;
	}

	$scope.changeJudgeModalView = function(action, judgeObj) {
		if (action === 'create') {
			$scope.judgeModalView = 'create';
			$scope.tabs[0].active = true;
		} else if (action === 'edit') {
      var judge = judgeObj.judge;
      var lastSpace = judge.name.lastIndexOf(' ');
			$scope.judgeModalView = 'edit';
			$scope.judgeId = judgeObj.id;
			$scope.judgeInfoForm.judgeFirstName = judge.name.substring(0, lastSpace);
			$scope.judgeInfoForm.judgeLastName = judge.name.substring(lastSpace + 1, judge.name.length);
			$scope.judgeInfoForm.judgeEmail = judge.email;
			$scope.judgeInfoForm.judgeAffliation = judge.affiliation;
      $scope.assignedTeams = judgeObj.teams;
      sessionStorage.putObject('draggedJudge', judgeObj); // Needed by judgeManagentService.assignedTeamsToJudge()
		}
	}

	$scope.closeJudgeModal = function() {
		$scope.judgeInfoForm = {};
		$('#judge-modal').modal('hide');
	}

	$scope.closeAssignByCatModal = function() {
		$('#judge-cat-assignment-modal').modal('hide');
		sessionStorage.remove('teamsInDropCat');
	}

	$scope.openAssignByCatModal = function() {
		setUpTeams().then(function() {
			$('#judge-cat-assignment-modal').modal();
		});

		function setUpTeams() {
			var defer = $q.defer();

			var teams = sessionStorage.getObject('teamsInDropCat');
			for (var i = 0; i < teams.length; i++) {
				teams[i].checked = true;
			}
			sessionStorage.putObject('teamsInDropCat', teams);
			defer.resolve();

			return defer.promise;
		}
	}

	$scope.selectSingleFilteredTeam = function(team) {
		if (false === $scope.isTeamSelected(team)) {
			$scope.selectFilteredTeam(team);
		} else {
			$scope.deselectFilteredTeam(team);
		}
	}

	$scope.selectAllFilteredTeams = function() {
		angular.forEach($scope.filteredTeams, function(team) {
			$scope.selectFilteredTeam(team);
		});
	};

	$scope.deselectAllFilteredTeams = function() {
		angular.forEach($scope.filteredTeams, function(team) {
			$scope.deselectFilteredTeam(team);
		});
	}

	$scope.selectFilteredTeam = function(team) {
		team.selected = true;
	}

	$scope.deselectFilteredTeam = function(team) {
		team.selected = false;
	}

	$scope.addJudge = function() {
		var judgeFormData = {
      email: $scope.judgeInfoForm.judgeEmail.trim(),
			first_name: $scope.judgeInfoForm.judgeFirstName.trim(),
			last_name: $scope.judgeInfoForm.judgeLastName.trim()
		};
		judgeManagementService.addJudge(judgeFormData).then(function() {
			// Refresh judge objects
			judgeManagementService.getJudges();
			$scope.closeJudgeModal();
		}).catch(function(error) {
			$scope.judgeErrorMessage = error;
		});
	}

	$scope.editJudge = function() {
		var judgeFormData = {
      email: $scope.judgeInfoForm.judgeEmail.trim(),
			first_name: $scope.judgeInfoForm.judgeFirstName.trim(),
			last_name: $scope.judgeInfoForm.judgeLastName.trim()
		};
		judgeManagementService.editJudge($scope.judgeId, 
                                     judgeFormData, 
                                     $scope.teamsToAdd, 
                                     $scope.teamsToRemove, 
                                     $scope.assignedTeams);
		$scope.closeJudgeModal();
	}

	$scope.assignTeamsToJudge = function() {
		var teamsToAdd = [];
		for (var i = 0; i < $scope.teamsInDropCat.length; i++) {
			if ($scope.teamsInDropCat[i].checked) {
				teamsToAdd.push($scope.teamsInDropCat[i]);
			}
		}
		if (teamsToAdd.length > 0) {
			judgeManagementService.assignTeamsToJudge(teamsToAdd);
		}
		$scope.closeAssignByCatModal();
	}

	$scope.addSelectedTeamsToJudgeModal = function(teams) {
		for (var i = 0; i < teams.length; i++) {
			if (teams[i].selected) {
				var index = $scope.teamsToAdd.indexOf(teams[i]);
        if (index === -1)
          $scope.teamsToAdd.push(teams[i]);
			}
		}
	}

	// Used for modal display.
	$scope.removeTeamFromJudge = function(team) {
		$scope.teamsToRemove.push(team);
    var index = $scope.assignedTeams.indexOf(team);
    if (index > -1)
      $scope.assignedTeams[index].toRemove = true;
	}

	// Also used for modal display.
	$scope.undoRemoveTeamFromJudge = function(team) {
		var index = $scope.teamsToRemove.indexOf(team);
		if (index > -1) {
			$scope.teamsToRemove.splice(index, 1);
		}
    index = $scope.assignedTeams.indexOf(team);
    if (index > -1)
      $scope.assignedTeams[index].toRemove = false;
	}

	// For modal display
	$scope.removeTeamToAdd = function(teamId) {
		for (var i = 0; i < $scope.teamsToAdd.length; i++) {
			if ($scope.teamsToAdd[i].id == teamId) {
				$scope.teamsToAdd.splice(i, 1);
				return;
			}
		}
	}

	$scope.clearTeamsToAdd = function() {
		$scope.teamsToAdd = [];
	}
}])

.filter('printAllCategories', function() {
	return function(team) {
		if (!team.categories)
			return '';
		var categoryLabels = '';
		for (var i = 0; i < team.categories.length; i++) {
			if (team.categories[i].label !== 'Uncategorized')
				categoryLabels += team.categories[i].label + ', ';
		}
		return categoryLabels.slice(0, -2);
	}
})

.filter('printAllTeams', function() {
	return function(selectedTeams) {
		var string = '';
		for (var i = 0; i < selectedTeams.length; i++) {
			if (i < selectedTeams.length - 1)
				string += selectedTeams[i].name + '; ';
			else
				string += selectedTeams[i].name;
		}
		return string.replace(',', ', ');
	}
})

.factory('JudgeManagementService', ['$q', 'CategoryManagementService', 'CurrentUserService', 'JudgeRESTService',
         'sessionStorage', 'TeamManagementService', 'UserRESTService', '$window',
	function($q, CategoryManagementService, CurrentUserService, JudgeRESTService,
				sessionStorage, TeamManagementService, UserRESTService, $window) {
	return function($scope, sessionStorage) {

		var judgeManagement = {};

		var categoryManagementService = CategoryManagementService($scope, sessionStorage);
		var teamManagementService = TeamManagementService($scope, sessionStorage);
		var judgeRESTService = JudgeRESTService(CurrentUserService.getAuthHeader());
    
		var eventId = sessionStorage.getObject('selected_event').id;
    
    judgeManagement.changeView = function(view) {
			sessionStorage.put('judgeView', view);
		}

		judgeManagement.getJudges = function() {
			var defer = $q.defer();

			judgeRESTService.judges.get({event_id: eventId}).$promise.then(function(resp) {
				sessionStorage.putObject('judges', resp);
				console.log('Judges successfully retrieved from server.');
			}).then(function() {
				var judges = sessionStorage.getObject('judges');
				judgeManagement.getJudgeTeams(judges).then(function() {
					defer.resolve();
				}).catch(function() {
					defer.reject();
				});
			}).catch(function() {
				defer.reject();
			});

			return defer.promise;
		}

		judgeManagement.getJudgeTeams = function(judges) {
			var defer = $q.defer();

			var judgePromises = [];

			for (var i = 0; i < judges.length; i++) {
				judgePromises.push(getJudgeTeam(judges[i]));
			}

			$q.all(judgePromises).then(function(judgesWithTeams) {
				sessionStorage.putObject('judges', judgesWithTeams);
        console.log('Successfully retrieved all judge teams.');
				defer.resolve();
			}).catch(function() {
        sessionStorage.putObject('generalErrorMessage', 'Error getting judge teams.');
				defer.reject('Error getting judge teams.');
			});

			return defer.promise;

			function getJudgeTeam(judge) {
				var defer = $q.defer();

				var judgeId = judge.id;
				judgeRESTService.judgeTeams.get({judge_id: judgeId}).$promise.then(function(resp) {
					judge.teams = resp;
					defer.resolve(judge);
				}).catch(function() {
					defer.reject(judge);
				});

				return defer.promise;
			}
		}

		judgeManagement.addJudge = function(judgeFormData) {
			var defer = $q.defer();

			// Todo: Check if a user with the email already exists (once that's in the API).
			var judgeReq = judgeFormData;
			var judgeId = null;
			var randomPass = judgeManagement.generatePassword();
			judgeReq.password = randomPass;
			judgeReq.password_confirmation = randomPass;

			// Register judge as a user & adds them to the event.
			UserRESTService.register(judgeReq).$promise.then(function(resp) {
				judgeId = resp.id;
				judgeRESTService.judges.addToEvent({event_id: eventId}, {judge_id: judgeId}).$promise.then(function(resp) {
					console.log('Judge successfully registered & added to event');
					defer.resolve('Finished addJudge()');
				}).catch(function() {
					sessionStorage.put('generalErrorMessage', 'Error adding judge to event');
					console.log('Error adding judge to event');
				});
			}).catch(function(error) {
				sessionStorage.put('generalErrorMessage', 'Error registering judge user');
				console.log('Error registering judge user');
				if (error.data.email !== undefined) {
					var error = 'Email already exists. Please use another.';
					defer.reject(error);
				}
			});

			return defer.promise;
		}
    
    judgeManagement.generatePassword = function() {
			// Most certainly should be done on the server (would require a call to make a judge user)
			var pass = "";
				var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

				for(var i = 0; i < 6; i++) {
						pass += possible.charAt(Math.floor(Math.random() * possible.length));
				}

				return pass;
		}

		judgeManagement.editJudge = function(judgeId, judgeFormData, teamsToAdd, teamsToRemove, assignedTeams) {
      var haveTeamsToAdd = removeRedundantTeamsToAdd();
      if (haveTeamsToAdd) {
        judgeManagement.assignTeamsToJudge(teamsToAdd).then(function() {
          console.log('Successfully assigned new judge teams.');
			    judgeManagement.getJudges();
        }).catch(function() {
          var error = 'Error assigning new judge teams.';
          sessionStorage.put('generalErrorMessage', error);
          console.log(error);
        }).finally(function() {
          $scope.teamsToAdd.length = 0;
        });
      }
      
      var haveTeamsToRemove = teamsToRemove.length !== 0;
      if (haveTeamsToRemove) {
        judgeManagement.removeTeamsFromJudge(teamsToRemove).then(function() {
          console.log('Successfully removed selected judge teams.');
          judgeManagement.getJudges();
        }).catch(function() {
            var error = 'Error removing selected judge teams.';
            sessionStorage.put('generalErrorMessage', error);
            console.log(error);
        }).finally(function() {
          $scope.teamsToRemove.length = 0;
        });
      }
      
      function removeRedundantTeamsToAdd() {
        /* Don't add a team, if the team has already been assigned */
        for (var i = 0; i < teamsToAdd.length; i++) {
          var alreadyExists = false;
          for (var j = 0; j < assignedTeams.length; j++) {
            if (assignedTeams[j].team.id === teamsToAdd[i].id)
              alreadyExists = true;
          }
          if (alreadyExists) 
            teamsToAdd.splice(i, 1);
        }
        
        /* Don't add a team, if the team is going to be removed */
        for (var i = 0; i < teamsToRemove.length; i++) {
          var index = teamsToAdd.indexOf(teamsToRemove[i]);
          if (index > -1)
            teamsToAdd.splice(index, 1);
        }
        
        return teamsToAdd.length !== 0;
      }
		}
    
    judgeManagement.assignTeamsToJudge = function(teams) {
			var defer = $q.defer();
      var promises = [];

			var judgeId = sessionStorage.getObject('draggedJudge').id;
      angular.forEach(teams, function(team) {
        promises.push(judgeManagement.assignTeamToJudge(team.id, judgeId));
      });

      $q.all(promises).then(function() {
        defer.resolve();
      });
			
			return defer.promise;
		}

		judgeManagement.assignTeamToJudge = function(teamId, judgeId) {
      var defer = $q.defer();
     
			judgeRESTService.judgeTeams.assign({judge_id: judgeId}, {team_id: teamId}).$promise.then(function(resp) {
        defer.resolve();
			}).catch(function() {
        defer.reject();
			});
      
      return defer.promise;
		}
    
    judgeManagement.removeTeamsFromJudge = function(teams) {
			var defer = $q.defer();
      var promises = [];

			var judgeId = sessionStorage.getObject('draggedJudge').id;
      angular.forEach(teams, function(teamObj) {
        console.log(teamObj.team.id + ' ' + judgeId);
        promises.push(judgeManagement.removeTeamFromJudge(teamObj.team.id, judgeId));
      });

      $q.all(promises).then(function() {
        defer.resolve();
      });
			
			return defer.promise;
		}

		judgeManagement.removeTeamFromJudge = function(teamId, judgeId) {
      var defer = $q.defer();
      
			judgeRESTService.judgeTeams.remove({judge_id: judgeId}, {team_id: teamId}).$promise.then(function(resp) {
        defer.resolve();
			}).catch(function() {
        defer.reject();
			});
      
      return defer.promise;
		}

		judgeManagement.getJudgeByID = function(judgeId) {
			var retVal = null;
			var judges = sessionStorage.getObject('judges');
			for (var i = 0; i < judges.length; i++) {
				if (judges[i].judge.id == judgeId) {
					retVal = judges[i];
				}
			}
			return retVal;
		}

		judgeManagement.openAssignByCatModal = function(categoryId, judgeId) {
			var judge = judgeManagement.getJudgeByID(judgeId);
			sessionStorage.putObject('draggedJudge', judge);

			// Getting a list of teamIds in a category
			categoryManagementService.getTeamsInCategory(categoryId).then(function(teams) {
				sessionStorage.putObject('teamsInDropCat', teams);
				$scope.openAssignByCatModal();
			});
		}

		judgeManagement.deleteJudge = function(judgeId, judge) {
			var defer = $q.defer();
			judgeRESTService.judge.delete({id: judgeId}).$promise.then(function() {
				judgeManagement.getJudges();
				console.log('Successfully deleted judge.');
				defer.resolve(true);
			}).catch(function(error) {
				sessionStorage.put('generalErrorMessage', 'Error deleting judge.');
				console.log('Error deleting judge: ' + JSON.stringify(error));
				defer.resolve(false);
			});
			return defer.promise;
		}

		return judgeManagement;
	}
}])

.factory('JudgeWatchService', ['sessionStorage', '$timeout', function (sessionStorage, $timeout) {
	return function($scope, sessionStorage) {
		var service = {};

		service.init = function() {
			sessionStorage.put('judgeView', 'default');

			$scope.$watch(function() {
				return sessionStorage.getObject('judges');
			}, function(newValue) {
				$scope.judges = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('teams');
			}, function(newValue) {
				$scope.teams = newValue;
				$scope.filteredTeams = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('selectedCategory');
			}, function(newValue) {
				$scope.selectedCategory = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.get('judgeView');
			}, function(newValue) {
				$scope.judgeView = newValue;
			});

			$scope.$watch(function() {
				return sessionStorage.getObject('teamsInDropCat');
			}, function(newValue) {
				$scope.teamsInDropCat = newValue;
			}, true);
		}

		return service;
	}
}])

.factory('JudgeRESTService', function($resource) {
	return function(authHeader) {
		return {
			judges: $resource('http://api.stevedolan.me/events/:event_id/judges', {
				event_id: '@id'
			}, {
				get: {
					method: 'GET',
          			isArray: true,
					headers: authHeader
				},
				addToEvent: {
					method: 'POST',
					headers: authHeader
				}
			}),
			judge: $resource('http://api.stevedolan.me/judges/:id', {
				id: '@id'
			}, {
				delete: {
					method: 'DELETE',
					headers: authHeader
				}
			}),
			judgeTeams: $resource('http://api.stevedolan.me/judges/:judge_id/teams', {
				judge_id: '@id'
			}, {
				get: {
					method: 'GET',
          isArray: true,
					headers: authHeader
				},
				assign: {
					method: 'POST',
					headers: authHeader
				},
				remove: {
					method: 'DELETE',
					url: 'http://api.stevedolan.me/judges/:judge_id/teams/:id',
					params: {judge_id: '@judge_id', id: '@team_id'},
					headers: authHeader
				}
			})
		}
	}
});

