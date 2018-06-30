registeringSW();
loadCurrencies();


// Opening IDB
function openDatabase() {
    if (!navigator.serviceWorker) {
        return Promise.resolve();
    }
    return idb.open('curr_converter1-db', 3, function (upgradeDb) {
        switch (upgradeDb.oldVersion) {
            case 0:
                upgradeDb.createObjectStore('currency', {
                    keyPath: "ABV"
                });
            case 1:
                upgradeDb.createObjectStore('conversions', {
                    keyPath: "FR_TO"
                });
        }
    });
}


//Registering SW
function registeringSW() {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Registration Worked!");
        if (!navigator.serviceWorker.controller) {
            return;
        }

        if (reg.waiting) {
            updateReady(reg.waiting);
            return;
        }

        if (reg.installing) {
            trackInstalling(reg.installing);
            return;
        }

        reg.addEventListener('updatefound', function () {
            trackInstalling(reg.installing);
        });
    })
    var refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
}




//update ready

function updateReady(worker) {
    if (confirm("New version available")) {
        worker.postMessage({
            action: 'skipWaiting'
        });
    } else {
        return;
    }
};

// Track installing

function trackInstalling(worker) {

    worker.addEventListener('statechange', function () {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
};

function loadCurrencies() {
    const selector = document.getElementsByTagName('select');
    const dbPromise = openDatabase();
    const message = document.getElementById('status_message');
    message.innerHTML = "";
    dbPromise.then(function (db) {
        fetch("https://free.currencyconverterapi.com/api/v5/currencies")
            .then(function (response) {
                console.log('response status', response.status)
                if (response.status !== 200) {
                    console.warn('Sorry, there is a problem. Status code: ', response.status);
                }

                response.json().then(function (data) {
                    let currencies = data.results;
                    for (curr in currencies) {
                        let opt = document.createElement("option");
                        let opt2 = document.createElement("option");
                        opt.value = currencies[curr].id;
                        opt.text = currencies[curr].currencyName;

                        //console.log(currencies[curr].currencyName);
                        opt2.value = currencies[curr].id;
                        opt2.text = currencies[curr].currencyName;
                        selector[0].appendChild(opt);
                        selector[1].appendChild(opt2);
                        const tx = db.transaction("currency", "readwrite");
                        const curStore = tx.objectStore("currency");
                        const cur = {
                            ABV: currencies[curr].id,
                            name: currencies[curr].currencyName
                        }
                        curStore.put(cur);
                        message.innerHTML = "You are n";

                    }

                })

            }).catch(
                loadCurFromDB()
            );

    });
}

function loadCurFromDB() {
    console.log('WORKING OFFLINE')
    const selector = document.getElementsByTagName('select');
    const dbPromise = openDatabase();
    dbPromise.then((db) => {
        const tx = db.transaction("currency");
        const curStore = tx.objectStore("currency");
        return curStore.getAll();
    }).then((currency) => {
        for (cur of currency) {
            //console.log('kakaka', cur)
            let opt = document.createElement("option");
            let opt2 = document.createElement("option");
            opt.value = cur['ABV'];
            opt.text = cur['name'];
            //console.log(currencies[curr].currencyName);
            opt2.value = cur['ABV'];
            opt2.text = cur['name'];
            selector[0].appendChild(opt);
            selector[1].appendChild(opt2);
        }
    })
}

function convertCur() {
    const dbPromise = openDatabase();
    dbPromise.then((db) => {
        const fromCurVal = document.getElementById("CURR_FR_VAL");
        const fromCur = document.getElementById("CURR_FR");
        const toCur = document.getElementById("CURR_TO");
        let toCurVal = document.getElementById("CURR_VAL");
        toCurVal.value = "";
        const fromTo = fromCur.value + "_" + toCur.value;
        const url = "https://free.currencyconverterapi.com/api/v5/convert?q=" + fromTo + "&compact=y";
            fetch(url).then(response => {
                if (response.status !== 200) {
                    console.warn('Sorry, there is a problem. Status code: ', response.status);
                }

                response.json().then(data => {
                    //console.log("DATA", data);
                    //console.log("the value", data[fromTo].val);
                    const tx = db.transaction("conversions", "readwrite");
                    const convStore = tx.objectStore("conversions");
                    const conv = {
                        FR_TO: fromTo,
                        VAL: data[fromTo].val
                    }
                    convStore.put(conv);
                    toCurVal.value = parseFloat(fromCurVal.value) * data[fromTo].val;
                });
            }).catch(
                convertFromDB()
            );
    });
}



function convertFromDB() {
    console.log('working from offline database')
    const dbPromise = openDatabase();
    dbPromise.then((db) => {
        
        const tx = db.transaction("conversions");
        const convStore = tx.objectStore("conversions");
        return convStore.getAll();

    }).then((conversions) => {
        console.log(conversions.keys())
        const fromCurVal = document.getElementById("CURR_FR_VAL");
        const fromCur = document.getElementById("CURR_FR");
        const toCur = document.getElementById("CURR_TO");
        let toCurVal = document.getElementById("CURR_VAL");
        toCurVal.value = "";
        for (con of conversions) {
            
            const fromTo = fromCur.value + "_" + toCur.value;
            if (fromTo === con["FR_TO"]){
                console.log('This is the chosen', fromTo, 'This is available', con['FR_TO'])
                toCurVal.value = parseFloat(fromCurVal.value) * con['VAL'];
                console.log('This is the conversion', toCurVal.value)
                return;
            }
        }
        toCurVal.value = "connection lost reconnect your internet"
    })

}

function btnClicked() {
    try {
        convertCur();
    } catch (error) {
        console.log('Network lost, convertiing form db')
        convertFromDB();
    }

}

function checkAndLoad() {
    try {
        loadCurrencies();
    } catch (error) {
        loadCurFromDB();
    }

}