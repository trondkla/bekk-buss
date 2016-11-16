var url = "http://tvguidn.com/bekk-buss.php?stopId=";
/*
  Original url http://bybussen.api.tmn.io/
  End points:
  /stops/ - Lister ut alle busstopp i Trondheim, f.eks:
      {"locationId":"16010050","name":"Bakkegata","longitude":10.407277885000969,"latitude":63.43224012981286,"distance":1184.8961078533653},
      {"locationId":"16011050","name":"Bakkegata","longitude":10.407245301548892,"latitude":63.43239304854984,"distance":1184.615146152353},
  /rt/:locationId - Se real time data for stop
      {"name":"Bakkegata                      (16010050)","lat":"10.40728","lon":"63.43224","next":[{"l":"22","t":"16.11.2016 18:04","ts":"16.11.2016 17:58","rt":1,"d":"Tyholt"},{"l":"6","t":"16.11.2016 18:06","ts":"16.11.2016 18:04","rt":1,"d":"Værestrøa"},{"l":"6","t":"16.11.2016 18:06","ts":"16.11.2016 18:04","rt":1,"d":"Værestrøa"},{"l":"4","t":"16.11.2016 18:07","ts":"16.11.2016 18:06","rt":1,"d":"Lade"},{"l":"18","t":"16.11.2016 18:10","ts":"16.11.2016 18:06","rt":1,"d":"Vikåsen"}]}

  However to circumvent Access-Control-Allow-Origin I made a proxy:
  http://tvguidn.com/bekk-buss.php?stopId=16011050 for /rt/
*/

var locationIdFromCity= "16010050";
var locationIdTowardsCity  = "16011050";

var Data = {
  nearestStop: "Bakkegata",
  nextBusses: [],
  lastSuccessfulUpdate: undefined,
  hasError: false
};

var App = {
  getBusData: (locationId) => {
    $.get(url + locationId)
      .done((response) => {
        var data = JSON.parse(response);
        var busInfo = App._parseBusInfo(data);
        App._updateBusData(busInfo);
        App.updateGui();
      })
      .fail((xhr, errorMsg, error) => {
        console.log(errorMsg);
        console.log(error);
        App.showError(error);
      })
      .always(() => {
        $(".loading").hide()
      });
  },

  updateData: () => {
    App.getBusData(locationIdTowardsCity);
    //App.getBusData(locationIdFromCity);
  },

  _updateBusData: (data) => {
    console.log(data);
    Data.nextBusses = data.next;
    Data.nearestStop = data.name;
    Data.lastSuccessfulUpdate = moment();
  },

  updateGui: () => {
    var minutesSinceLastUpdate = Data.lastSuccessfulUpdate.diff(moment(), 'minutes');
    if (minutesSinceLastUpdate > 10) {
      App.showError();
      return;
    }

    var busHtml = Data.nextBusses.map(bus => {
      var diffMinutes = bus.time.diff(moment(), 'minutes');
      let departingSoon = (diffMinutes <= 4) ? "bus-departing-soon" : "";
      let liveHtml = `<i class="fa fa-${(bus.liveData ? "bus" : "calendar")} ${departingSoon}"></i>`;
      return `<li class="avgang">
                <div class="line-time">
                  <span class="destionation">${bus.destionation}</span>
                  <span class="line">${bus.line} ${liveHtml}</span>
                </div>
                <span class="time">${moment(bus.time).toNow(true)}</span>

             </li>`})
             .join('');

    App.render(`
      <b>${Data.nearestStop} inn til byen</b>

      <ul class="avganger">
        ${busHtml}
      </ul>
    `);
  },

  showError: (error) => {

    App.render(`
        <p>
          Error: <pre>${error}</pre>
        </p>
      `);

  },

  render: (html) => {
    $(".busser")
      .toggleClass('hide', false)
      .html(html);
  },

  parseBusTime: (time) => {
    return moment(time, "DD.MM.YYYY HH:mm");
  },

  _parseBusInfo: (data) => {
    console.log("her", data);
    console.log(data.name);
    var name = data.name.split("(");
    if (name.length > 1) {
      name = $.trim(name[0]);
    }

    var next = [];
    Array.prototype.forEach.call(data.next, function(bus, i){
      var liveData = bus.rt > 0;
      var liveTime = App.parseBusTime(bus.t);
      var scheduledTime = App.parseBusTime(bus.ts);
      next.push({
        destionation: bus.d,
        line: bus.l,
        liveData: liveData,
        time: liveData ? liveTime : scheduledTime
      });
    });
    return {
      name: name,
      next: next
    };
  }
};

App.updateData();
//window.setInterval(App.updateData, 10*1000);
