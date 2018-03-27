var connectedPrinterIDs = new Array();
var connectedPrinters = new Array();

function selectPrinter(printerID)
{
    selectedPrinterID = printerID;
    localStorage.setItem(selectedPrinterVar, printerID);
    window.location.href = homePage;
}

function promisePrinterStatus(printerID)
{
    return promiseGetCommandToRoot(printerID + '/remoteControl', null);
}

function updatePrinterStatus(printerData)
{
    var machineDetails = getMachineDetails(printerData.printerTypeCode)
    var jel = $('.printer-selector[printer-id="' + printerData.printerID + '"]');
    jel.html(printerData.printerName)
       .css('background-color', printerData.printerWebColourString);
    var normalURL = null;
    var hoverURL = null;
    if (getComplimentaryOption(jel.css('background-color'), true, false))
    {
        // Use dark icons.
        normalURL = 'url("' + imageRoot + machineDetails['icon-normal-dark'] + '")';
        highlightURL = 'url("' + imageRoot + machineDetails['icon-highlight-dark'] + '")';
    }
    else
    {
        // Use light icons.
        normalURL = 'url("' + imageRoot + machineDetails['icon-normal-light'] + '")';
        highlightURL = 'url("' + imageRoot + machineDetails['icon-highlight-light'] + '")';
    }
    jel.css('background-image', (jel.is(':hover') ? highlightURL : normalURL))
       .hover(function() { $(this).css('background-image', highlightURL); },
              function() { $(this).css('background-image', normalURL); });
    
    //var statusText = printerData.printerStatusString;
    //$('#' + printerID + statusDisplayTag).text(statusText);
    //$('#' + printerID + colourDisplayTag).css("background-color", printerData.printerWebColourString);
    //if ((printerData.printerStatusEnumValue.match("^PRINTING_PROJECT")
    //        || printerData.printerStatusEnumValue.match("^PAUSED")
    //        || printerData.printerStatusEnumValue.match("^PAUSE_PENDING")
    //        || printerData.printerStatusEnumValue.match("^RESUME_PENDING"))
    //        && printerData.totalDurationSeconds > 0)
    //{
    //    var timeElapsed = printerData.totalDurationSeconds - printerData.etcSeconds;
    //    if (timeElapsed < 0)
    //    {
    //        timeElapsed = 0;
    //   }
    //    var progressPercent = (timeElapsed * 1.0 / printerData.totalDurationSeconds) * 100;
    //    //$('#' + printerID + progressDisplayTag).css("width", progressPercent + "%");
    //} else
    //{
    //    //$('#' + printerID + progressDisplayTag).css("width", "0%");
    //}
    //updateControlButtons(printerData);
}

function addPrinter(printerID)
{
    connectedPrinterIDs.push(printerID);
    
    // add to the first free printer-selector.
    $('.printer-selector[printer-id=""]')
        .first()
        .removeClass('rbx-invisible')
        .attr('printer-id', printerID);
    
//    getPrinterStatus(printerID, function (data) {
//        connectedPrinters.push(data);
//    });
}

function deletePrinter(printerID)
{
    var indexToDelete = connectedPrinterIDs.indexOf(printerID);
    connectedPrinterIDs.splice(indexToDelete, 1);
    connectedPrinters.splice(indexToDelete, 1);
    
    // Hide the printer selector for this printer.
    $('.printer-selector[printer-id="' + printerID + '"]')
        .addClass('rbx-invisible')
        .attr('printer-id', '');
}

function processAddedAndRemovedPrinters(printerIDs)
{
    var printersToDelete = new Array();
    var printersToAdd = new Array();
    for (var printerIDIndex = 0; printerIDIndex < connectedPrinterIDs.length; printerIDIndex++)
    {
        var printerIDToConsider = connectedPrinterIDs[printerIDIndex];
        if (printerIDs.indexOf(printerIDToConsider) < 0)
        {
            //Not in the list of discovered printers - we need to delete it
            printersToDelete.push(printerIDToConsider);
        }
    }

    for (var printerIDIndex = 0; printerIDIndex < printerIDs.length; printerIDIndex++)
    {
        var printerIDToConsider = printerIDs[printerIDIndex];
        if (connectedPrinterIDs.indexOf(printerIDToConsider) < 0)
        {
            //Not in the list - we need to add it
            printersToAdd.push(printerIDToConsider);
        }
    }

    printersToDelete.forEach(deletePrinter);
    printersToAdd.forEach(addPrinter);
    return (printersToDelete.length > 0
            || printersToAdd.length > 0);
}

function updatePrinterStatuses()
{
    if (connectedPrinterIDs.length === 0)
    {
        $('.printer-selector').addClass('rbx-invisible');
    }
    //else if (connectedPrinterIDs.length = 1)
	//{
	//	selectPrinter(connectedPrinterIDs[0]);
	//}
    else
    {
		for (var printerIndex = 0; printerIndex < connectedPrinterIDs.length; printerIndex++)
		{
			var printerID = connectedPrinterIDs[printerIndex];
			promisePrinterStatus(printerID)
                .then(updatePrinterStatus)
                .catch()
        }
    }
}

function getPrinterList()
{
    promiseGetCommandToRoot('discovery/listPrinters', null)
        .then(function (data) {
                processAddedAndRemovedPrinters(data.printerIDs);
                updatePrinterStatuses();
                connectedToServer = true;
            })
        .catch(function () {
                $('.printer-selector').addClass('rbx-invisible');
                connectedToServer = false;
                logout();
            })
}

function getServerStatus()
{
    promiseGetCommandToRoot('discovery/whoareyou', null)
    .then(function (data) {
                $('#serverOnline').text(i18next.t('online'));
                updateServerStatus(data);
                connectedToServer = true;
                if (typeof serverOnline === "function")
                {
                   serverOnline(); 
                }
            })
        .catch(function (data) {
                connectedToServer = false;
                $('#serverOnline').text(i18next.t('offline'));
                updateServerStatus(null);
                if (typeof serverOffline === "function")
                {
                   serverOffline(); 
                }
            });
}

function updateServerStatus(serverData)
{
    if (serverData === null)
    {
        //$('#serverVersion').text("");
        //$(".serverStatusLine").text("");
        //$(".server-name-title").text("");
        //$("#server-name-input").val("");
        //$(".server-ip-address").val("");
    } else
    {
        if (lastServerData == null
            || serverData.name !== lastServerData.name
            || serverData.serverIP !== lastServerData.serverIP
            || serverData.serverVersion !== lastServerData.serverVersion)
        {
            //$('#serverVersion').text(serverData.serverVersion);
            //$(".serverStatusLine").text(serverData.name);
            //$(".server-name-title").text(serverData.name);
            //$("#server-name-input").val(serverData.name);
            //$(".server-ip-address").text(serverData.serverIP);
            //$(".serverIP").text(serverData.serverIP);
            lastServerData = serverData;
        }
    }
}

function getStatus()
{
    getServerStatus();
    getPrinterList();
}

function printerStatusInit()
{
    $('.printer-selector')
        .attr('printer-id', '')
        .addClass('rbx-invisible')
        .on('click', function () {
            var printerSelected = $(this).attr('printer-id');
            if (printerSelected != null)
            {
                selectPrinter(printerSelected);
            }
        });

    getServerStatus();
    getPrinterList();
    setInterval(getStatus, 2000);
}
