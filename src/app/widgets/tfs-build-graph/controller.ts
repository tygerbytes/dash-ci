﻿namespace DashCI.Widgets.TfsBuildGraph
{
    export class TfsBuildGraphController implements ng.IController {
        public static $inject = ["$scope", "$q", "$timeout", "$interval", "$mdDialog", "tfsResources"];

        private data: ITfsBuildGraphData;

        constructor(
            private $scope: Models.IWidgetScope,
            private $q: ng.IQService,
            private $timeout: ng.ITimeoutService,
            private $interval: ng.IIntervalService,
            private $mdDialog: ng.material.IDialogService,
            private tfsResources: () => Resources.Tfs.ITfsResource
        ) {
            this.data = this.$scope.data;
            this.data.id = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            this.data.type = Models.WidgetType.tfsBuildGraph;
            this.data.footer = false;
            this.data.header = true;

            this.$scope.$watch(
                () => this.$scope.$element.height(),
                (height: number) => this.sizeFont(height)
            );
            this.$scope.$watch(
                () => this.data.poolInterval,
                (value: number) => this.updateInterval()
            );
            this.$scope.$on("$destroy", () => this.finalize());

            this.init();
            this.$timeout(() => this.sizeFont(this.$scope.$element.height()), 500);
        }

        private handle: ng.IPromise<any>;
        private finalize() {
            if (this.handle)
                this.$interval.cancel(this.handle);
            console.log("dispose: " + this.data.id + "-" + this.data.title);
        }

        private init() {
            this.data.title = this.data.title || "Build Graph";
            this.data.color = this.data.color || "blue";

            //default values
            this.data.poolInterval = this.data.poolInterval || 10000;


            this.updateInterval();
            this.update();
        }

        private sizeFont(height: number) {
            var header_size = this.$scope.$element.find(".header").height();

            var histogram = this.$scope.$element.find(".histogram");
            histogram.height(height - 50);

            var help_icon = this.$scope.$element.find(".unknown");
            var size = Math.round(height / 1) - header_size - 5;
            help_icon.css("font-size", size);
            help_icon.height(size);
        }

        public config() {
            this.$mdDialog.show({
                controller: TfsBuildGraphConfigController,
                controllerAs: "ctrl",
                templateUrl: 'app/widgets/Tfs-Build-graph/config.html',
                parent: angular.element(document.body),
                //targetEvent: ev,
                clickOutsideToClose: true,
                fullscreen: false,
                resolve: {
                    config: () => {
                        var deferred = this.$q.defer();
                        this.$timeout(() => deferred.resolve(this.data), 1);
                        return deferred.promise;
                    }
                }
            });
            //.then((ok) => this.createWidget(type));

        }

        private updateInterval() {
            if (this.handle)
                this.$interval.cancel(this.handle);
            this.handle = this.$interval(() => this.update(), this.data.poolInterval);
            this.update();
        }

        public builds: Resources.Tfs.IBuild[];


        private update() {
            if (!this.data.project || !this.data.build)
                return;
            var res = this.tfsResources();
            if (!res)
                return;

            console.log("start request: " + this.data.id + "; " + this.data.title);
            res.recent_builds({
                project: this.data.project,
                build: this.data.build,
                count: 40 
            }).$promise.then((result) => {
                console.log("end request: " + this.data.id + "; " + this.data.title);
                var builds = result.value.reverse();
                var maxDuration = 1; 
                angular.forEach(builds, (item) => {
                    if (item.finishTime) {
                        var finishTime = moment(item.finishTime);
                        var startTime = moment(item.startTime);
                            
                        
                        item.duration = finishTime.diff(startTime, 'seconds');
                        if (maxDuration < item.duration)
                            maxDuration = item.duration;
                    }
                });

                var width = (100 / builds.length);
                angular.forEach(builds, (item, i) => {
                    var height = Math.round((100 * item.duration) / maxDuration);
                    if (height < 1) height = 1;
                    item.css = {
                        height: height.toString() + "%",
                        width: width.toFixed(2) + "%",
                        left: (width * i).toFixed(2) + "%"
                    };
                });

                this.builds = builds;
                this.$timeout(() => this.sizeFont(this.$scope.$element.height()), 500);
            }).catch((reason) => {
                this.builds = [];
                console.error(reason);
            });
        }

    }
}