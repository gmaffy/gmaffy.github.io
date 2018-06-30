
registeringSW();
loadCurrencies();


// Opening IDB
function openDatabase() {
    if (!navigator.serviceWorker) {
        return Promise.resolve();
    }
    return idb.open('curr_converter1-db', 3, (upgradeDb) => {
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

        reg.addEventListener('updatefound',  () => {
            trackInstalling(reg.installing);
        });
    })
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
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
    //const message = document.getElementById('status_message');
    //message.innerHTML = "";
    dbPromise.then((db) => {
        fetch("https://free.currencyconverterapi.com/api/v5/currencies")
            .then((response) => {
                console.log('response status', response.status)
                if (response.status !== 200) {
                    console.warn('Sorry, there is a problem. Status code: ', response.status);
                }

                response.json().then((data) => {
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
                    }
                })
            }).catch(() => {
                console.log('You are now offline');
                loadCurFromDB();
            })
    });
}

function loadCurFromDB() {
    //const message = document.getElementById('status_message');
    //message.innerHTML = "You are now OFFLINE";
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
    const messege = document.getElementById('conv_from')
    dbPromise.then((db) => {
        const fromCurVal = document.getElementById("CURR_FR_VAL");
        const fromCur = document.getElementById("CURR_FR");
        const toCur = document.getElementById("CURR_TO");
        let toCurVal = document.getElementById("CURR_VAL");
        toCurVal.value = "";
        const fromTo = fromCur.value + "_" + toCur.value;
        const url = "https://free.currencyconverterapi.com/api/v5/convert?q=" + fromTo + "&compact=y";
        fetch(url).then((response) => {
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
                messege.innerHTML = 'You converted this from the CURRENT RATE';
            });
        }).catch(() => {
            console.log('You are converting from an offline DB')
            convertFromDB();
        })
    });
}

function convertFromDB() {
    console.log('working from offline database');
    const messege = document.getElementById('conv_from')
    messege.innerHTML = "Your conversion may not be accurate. You are not connected to the internet!";
    const dbPromise = openDatabase();
    dbPromise.then((db) => {

        const tx = db.transaction("conversions");
        const convStore = tx.objectStore("conversions");
        return convStore.getAll();

    }).then((conversions) => {
        //console.log(conversions.keys())
        const fromCurVal = document.getElementById("CURR_FR_VAL");
        const fromCur = document.getElementById("CURR_FR");
        const toCur = document.getElementById("CURR_TO");
        let toCurVal = document.getElementById("CURR_VAL");
        toCurVal.value = "";
        for (con of conversions) {
            const fromTo = fromCur.value + "_" + toCur.value;
            if (fromTo === con["FR_TO"]) {
                toCurVal.value = parseFloat(fromCurVal.value) * con['VAL'];
                return;
            }
        }
        toCurVal.value = "LOST CONNECTION"
    })
}
