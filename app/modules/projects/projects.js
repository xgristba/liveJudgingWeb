'use strict';

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'ngCookies', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'ProjectsCtrl'
  });
}])

.controller('ProjectsCtrl', ['$scope', '$cookies', 'CurrentUserService', function($scope, 
																																									$cookies, 
																																									CurrentUserService) {

		$cookies.categoryList = [{
			'name': "Uncategorized",
			'desc': "Sample description for Uncategorized",
			'time': "1:00am",
			'color': "#f0ad4e",
			'projects': ["Tiger"],
			'judges': []
		}, 
		{
			'name': "Cat A.",
			'desc': "Sample description for Cat A.",
			'time': "2:00pm",
			'color': "#5bc0de",
			'projects': ["Lemur"], 
		  'judges': ["Batman"]
		},
		{
			'name': "Cat B.",
			'desc': "Sample description for Cat B.",
			'time': "3:00pm",
			'color': "#d9534f",
			'projects': ["Lion", "Monkey"], 
			'judges': ["Superman", "Hulk"]
		}];
		$cookies.projectList = ["Lemur", "Turtle", "Fish", "Cheetah", "Bear"];

		$scope.categoryModalID = '#edit-category-modal';
		$scope.currentView = "default";
		$scope.categoryList = $cookies.categoryList;
		$scope.projectList = $cookies.projectList;
		$scope.categoryModalView = "";

		$scope.getTimeOptions = function() {
			var times = [];
			for (var i = 1; i <= 12; i++) {
				for (var j = 0; j <= 45; j += 15) {
					if (j == 0) times.push(i + ":" + j + j);
					else	times.push(i + ":" + j);
				}
			}
			return times;
		}
		$scope.timeOptions = $scope.getTimeOptions();

		$scope.changeView = function(view) {
			$scope.currentView = view;
		}

		$scope.createNewCategory = function() {
			var categoryPeriod = ($scope.categoryPeriod === 'on') ? 'am' : 'pm';
			var newCategory = {
				name: $scope.categoryName,
				desc: $scope.categoryDesc,
				time: $scope.categoryTime + categoryPeriod,
				color: $scope.categoryColor,
				projects: [],
				judges: []
			}
			$cookies.categoryList.push(newCategory);
			$scope.closeCategoryModal();
			console.log("New category created: " + JSON.stringify(newCategory));
		}

		$scope.editSelectedCategory = function() {
			var updatedCategoryPeriod = ($scope.updatedCategoryPeriod === true) ? 'am' : 'pm';
			var updatedCategory = {
				name: $scope.updatedCategoryName,
				desc: $scope.updatedCategoryDesc,
				time: $scope.updatedCategoryTime + updatedCategoryPeriod,
				color: $scope.updatedCategoryColor,
				projects: $scope.categoryToEdit.projects,
				judges: $scope.categoryToEdit.judges
			}
			$scope.closeCategoryModal();
			$scope.updateCategoryCookie('name', $scope.categoryName, updatedCategory);
			console.log("Category edited: " + JSON.stringify(updatedCategory));
		}

		$scope.seeCategoryDetails = function(event) {
			var category = $(event.currentTarget);
			var categoryName = category.find('h3').text().trim();
			$cookies.currentCategory = $scope.getCategoryByName(categoryName);
			$scope.currentCategory = $cookies.currentCategory;
			$scope.changeView('currentCategory');
		}

		$scope.getCategoryByName = function(value) {
			for (var i = 0; i < $cookies.categoryList.length; i++) {
				if ($cookies.categoryList[i].name == value) return $cookies.categoryList[i];
			}
		}

		$scope.updateCategoryCookie = function(param, value, newObject) {
			if (param === 'name') {
				for (var i = 0; i < $cookies.categoryList.length; i++) {
					if ($cookies.categoryList[i].name == value) {
						$cookies.categoryList[i] = newObject;
					}
				}
			}
		}

		$scope.clearCategoryModal = function() {
			$scope.categoryName = '';
			$scope.categoryDesc = '';
			$scope.categoryTime = '';
			$scope.categoryPeriod = '';
			$scope.categoryColor = ''; 
			$($scope.categoryModalID).modal('hide');
		}

		$scope.closeCategoryModal = function() {
			$($scope.categoryModalID).modal('hide');
		}

		$scope.changeCategoryModalViewToCreate = function() {
			$scope.categoryModalView = 'create';
			$($scope.categoryModalID).modal('show');
		}

		$scope.changeCategoryModalViewToEdit = function(event, category) {
			$scope.categoryModalView = 'edit';
			$scope.categoryToEdit = category;

			var time, period;
			if (category.time.search('a') !== -1) {
				period = true; // true == am
				time = category.time.split('a')[0];
			} else {
				period = false; // false == pm
				time = category.time.split('p')[0];
			}
			
			$scope.categoryName = category.name;
			$scope.categoryDesc = category.desc;
			$scope.categoryTime = time;
			$scope.categoryPeriod = period;
			$scope.categoryColor = category.color; 

			event.stopPropagation(); // Prevent button behind it from redirecting the page
			$($scope.categoryModalID).modal('show'); // Show the modal
		}

		$scope.$watch('categoryName', function(value) {
      $scope.updatedCategoryName = value
    });
    $scope.$watch('categoryDesc', function(value) {
    	$scope.updatedCategoryDesc = value
    });
    $scope.$watch('categoryTime', function(value) {
    	$scope.updatedCategoryTime = value
    });
    $scope.$watch('categoryPeriod', function(value) {
    	$scope.updatedCategoryPeriod = value
    });
    $scope.$watch('categoryColor', function(value) {
    	$scope.updatedCategoryColor = value
    });

}])

.directive('cngDraggableProject', [function() { 

	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.draggable({
				cursor: 'grab',
				start: function(event, ui) { 
				  $(this).draggable('option', 'cursorAt', {
				    left: Math.floor(ui.helper.width() / 2),
				    top: Math.floor(ui.helper.height() / 2)
				  }); 
				}
			});
		}
	};

}])

.directive('cngSortableList', function() {

	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.sortable({
				axis: 'y',
				containment: 'parent',
				cursor: 'grab',
				cursorAt: { left: 5 },
				handle: '.glyphicon-sort',
				cancel: ''
			});
		}
	};

})

.directive('cngDroppableCategory', ['$cookies', function($cookies) {

	var link = function(scope, elem, attrs) {
		elem.droppable({
			drop: function(event, ui) {
				var droppedProject = ui.draggable;

				if (droppedProject.is('[cng-draggable-project]')) {
		    	droppedProject.fadeOut(400);
		    	var categoryContainer = $(event.target).find('a');
		    	var originalColor = categoryContainer.css('backgroundColor');
					categoryContainer.animate({
	          backgroundColor: "#fff"
					}, 400);
					categoryContainer.animate({
	          backgroundColor: originalColor
					}, 400);

		    	var categoryName = $(event.target).find('.droppable-category-header').text().trim();
		    	var projectName = droppedProject.find('.draggable-project-name').text().trim();
		    	droppedProjectCallback(scope, categoryName, projectName);
		  	}
			}
		});

		elem.find('.btn').mouseenter(function() {
			var cog = $(this).find('.glyphicon-cog'), sort = $(this).find('.glyphicon-sort');
			cog.show();
			sort.show();
		});

		elem.find('.btn').mouseleave(function() {
			var cog = $(this).find('.glyphicon-cog'), sort = $(this).find('.glyphicon-sort');
			cog.hide();
			sort.hide();
		});
	}

	var droppedProjectCallback = function(scope, categoryName, projectName) {
		var category = scope.getCategoryByName(categoryName);
		category.projects.push(projectName);
		scope.$apply();
	}

	return {
		restrict: 'A',
		link: link	
	};

}])

.directive('cngPeriodSwitch', function() {

	return {
		restrict: 'A',
		require: '^ngModel',
		scope: {
			state: '@text'
		},
		link: function(scope, elem, attrs) {
			elem.bootstrapSwitch({
				onText: 'am',
				offText: 'pm', 
				state: true
			});
			scope.$watch('state', function(value) {
				var booleanVal = value === 'true';
				console.log(value);
			
			});
		}
	};

})

.directive('cngColorPicker', function() {

	return {
		restrict: 'A',
		require: '^ngModel',
		link: function(scope, elem, attrs) {
			elem.colorPicker();
		}
	};

});