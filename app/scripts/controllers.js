angular.module('app')

.controller('LoginCtrl', function ($scope, $state, UserSrv){
  'use strict';
  var data = {}, fn = {};
  $scope.data = data;
  $scope.fn = fn;

  data.credentials = {
    email: '',
    password: ''
  };
  data.status = {
    form: 'login',
    loading: false,
    error: '',
    success: ''
  };


  fn.login = function(){
    data.status.loading = true;
    data.status.error = '';
    UserSrv.login(data.credentials).then(function(user){
      data.status.loading = false;
      $state.go('user.home');
    }, function(error){
      data.credentials.password = '';
      data.status.loading = false;
      data.status.error = error.message;
    });
  };
  fn.recover = function(){
    data.status.loading = true;
    data.status.error = '';
    UserSrv.passwordRecover(data.credentials).then(function(){
      data.status.loading = false;
      data.status.success = 'Check your inbox for password recovery !';
    }, function(error){
      data.status.loading = false;
      data.status.error = error.message;
    });
  };
  fn.signup = function(){
    data.status.loading = true;
    data.status.error = '';
    UserSrv.signup(data.credentials).then(function(user){
      data.status.loading = false;
      $state.go('user.home');
    }, function(error){
      data.credentials.password = '';
      data.status.loading = false;
      data.status.error = error.message;
    });
  };
})


.controller('MainCtrl', function($scope, $state, UserSrv){
  'use strict';
  $scope.logout = function(){
    UserSrv.logout().then(function(){
      $state.go('anon.login');
    });
  };
})


.controller('DashboardCtrl', function($scope){
  'use strict';
  $scope.alerts = [
    {type: 'success', msg: 'Thanks for visiting! Feel free to create pull requests to improve the dashboard!'},
    {type: 'danger', msg: 'Found a bug? Create an issue with as many details as you can.'}
  ];

  $scope.addAlert = function(){
    $scope.alerts.push({msg: 'Another alert!'});
  };

  $scope.closeAlert = function(index){
    $scope.alerts.splice(index, 1);
  };
})


.controller('LibsCtrl', function($scope){
  'use strict';
  var data = {};
  $scope.data = data;

  /*
   * Alerts :
   *  - http://lipis.github.io/bootstrap-sweetalert/
   * Notifications :
   *  - http://cgross.github.io/angular-notify/demo/
   *  - http://jvandemo.github.io/angular-growl-notifications/
   *
   * Dashboards :
   *  - http://webapplayers.com/inspinia_admin-v1.6/ (https://wrapbootstrap.com/theme/inspinia-responsive-admin-theme-WB0R5L90S)
   *  - http://condorthemes.com/flatdream/ (https://wrapbootstrap.com/theme/flat-dream-responsive-admin-template-WB004G996)
   *  - http://rubix.sketchpixy.com/ltr/#/app/dashboard (https://wrapbootstrap.com/theme/rubix-reactjs-powered-admin-template-WB09498FH)
   */
  data.libs = [{
    name: 'ng-admin',
    url: 'https://github.com/marmelab/ng-admin',
    description: 'Easily add an admin CRUD to any REST API !',
    demo: 'http://ng-admin.marmelab.com/'
  },{
    name: 'sensei-grid',
    url: 'https://github.com/datazenit/sensei-grid',
    description: 'Simple data grid (excel like) with edit functions',
    demo: 'https://datazenit.com/static/sensei-grid/examples/'
  },{
    name: 'ment.io',
    url: 'https://github.com/jeff-collins/ment.io',
    description: 'Twitter like textarea typeahead based on a trigger character',
    demo: 'http://jeff-collins.github.io/ment.io/'
  }];

  data.samples = [{
    name: 'keen-dashboards',
    url: 'https://github.com/keen/dashboards',
    description: 'Sample dashboard layouts from keen.io',
    demo: 'http://keen.github.io/dashboards/'
  }, {
    name: 'dashboard-samples',
    url: 'http://thedesigninspiration.com/articles/25-innovative-dashboard-concepts-and-designs/',
    description: '25 Innovative Dashboard Concepts and Designs'
  }];
});
