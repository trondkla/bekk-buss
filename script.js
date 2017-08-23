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

/*
 * Tasks:
 * 1. Live updates
 * 2. Animation
 */

const locationIdFromCity= "16010050";
const locationIdTowardsCity  = "16011050";

const locationIdCustomNames = {
  [locationIdFromCity]: 'Fra midtbyen <-',
  [locationIdTowardsCity]: 'Mot midtbyen ->',
};

const departuresHowFarAwayInMinutes = 15;
const departuresHowFarAwayInSeconds = departuresHowFarAwayInMinutes * 60;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var Data = {
  stops: {},
  lastSuccessfulUpdate: undefined,
  hasError: false
};

var App = {
  getBusData: (locationId) => {
    $.get(url + locationId)
      .done((response) => {
        var data = JSON.parse(response);
        var busInfo = App._parseBusInfo(data);
        App._updateBusData(locationId, busInfo);
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
    App.getBusData(locationIdFromCity);
  },

  _updateBusData: (locationId, data) => {
    const nowPlus15Minutes = moment().add(departuresHowFarAwayInMinutes, 'minutes');
    const filteredDepartures = data.next.filter( dep => dep.time.isBefore(nowPlus15Minutes));
    Data.stops[locationId] = filteredDepartures;
    Data.lastSuccessfulUpdate = moment();
  },

  _findXCoordinateFromRemainingTime: (departureTime, reversePaddingDirection = false) => {
    const remainingSeconds = departureTime.diff(moment(), 'seconds');
    const windowWidth = $(window).width();
    const xCoord = ((departuresHowFarAwayInSeconds - remainingSeconds) / departuresHowFarAwayInSeconds) * windowWidth;
    if (reversePaddingDirection)
      return windowWidth - xCoord;
    return xCoord;
  },

  _buildHtmlFromDepartures: (busData, reversePaddingDirection = false) => {
    var departureHtml = busData.map(bus => {
        var diffMinutes = bus.time.diff(moment(), 'minutes');
        let departingSoon = (diffMinutes <= 4) ? "bus-departing-soon" : "";
        let liveHtml = `<i class="fa fa-${(bus.liveData ? "bus" : "calendar")} ${departingSoon}"></i>`;
        return `<li class="avgang" style="padding-left: ${ App._findXCoordinateFromRemainingTime(bus.time, reversePaddingDirection) }px">
                  <span class="line">${bus.line} ${liveHtml}</span>
                  <span class="time">${moment(bus.time).toNow(true)}</span>
              </li>`;
      })
      .join('');
    return departureHtml;
  },

  updateGui: () => {
    var minutesSinceLastUpdate = Data.lastSuccessfulUpdate.diff(moment(), 'minutes');
    if (minutesSinceLastUpdate > 10) {
      App.showError();
      return;
    }

    // TODO: Make general
    const busFromData = Data.stops[locationIdFromCity];
    const busTowardsData = Data.stops[locationIdTowardsCity];

    const busFromHtml = busFromData ? App._buildHtmlFromDepartures(busFromData, true) : '';
    const busTowardsHtml = busTowardsData ? App._buildHtmlFromDepartures(busTowardsData) : '';

    App.render(`
      <h2>${locationIdCustomNames[locationIdFromCity]}</h2>
      <ul class="avganger">
        ${busFromHtml}
      </ul>

      <h2>${locationIdCustomNames[locationIdTowardsCity]}</h2>
      <ul class="avganger">
        ${busTowardsHtml}
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

  startLoop: () => {
    window.setInterval(function(){
      App.updateData();
    }, 5000);
  },

  parseBusTime: (time) => {
    return moment(time, "DD.MM.YYYY HH:mm");
  },

  _parseBusInfo: (data) => {
    // console.log("her", data);
    // console.log(data.name);
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

// App.updateData();
App.startLoop();
//window.setInterval(App.updateData, 10*1000);
