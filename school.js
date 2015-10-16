/**********************************************************

It is extremely important that you change the variable schoolname to YOUR university 
to make this extension to work. 

schoolanem is the first variable declared


*******************************************************///
// Main
var numClasses = $('table tr:last').index() + 1;

/*
More than > 10000 while to load, so we give the user the option to load with a button.
*/

schoolname = 'YOUR UNIVERSITY'; //  CHANGE THIS PLEASE
var exceptions = {};
 
if (numClasses <= 1000){
    appendRMPColumn(exceptions);
} else {

    var btn = document.createElement('BUTTON');
    var show = document.createTextNode('Show Rate My Professor Ratings');
    var warning = document.createTextNode('There are more than 1000 classes on this page; the load might take a while. Use at your own risk :)');
    btn.appendChild(show);
    btn.className = 'srchButtons';
    btn.onclick = function() { 
        btn.innerHTML = 'Refresh Rate My Professor Ratings';
        appendRMPColumn(exceptions); 
    };
    document.getElementById('h1').appendChild(btn);
    document.getElementById('h1').appendChild(warning);
}

//Insert a column with the ratings and corresponding professor pages for each professor from Ratemyprofessor.com

function appendRMPColumn(exceptions) {

    //Insert a column header
    $('thead').find('tr').each(function() {
        $(this).find('th').eq(4).after('<th>Rate My Professor Score(s)</th>');
    });

    var processedProfessors = []; //for keeping track of duplicate professors

    //Insert the column by adding an individual cell to each row.
    $('tbody').find('tr').each(function() {

        //Get and transform the professor's name form "last, first" form to "last(+middle)+first" form so it may be appended to the search URL
        var professorName = $(this).find('td').eq(4).html();
        var URLprofessorName = professorName.replace(/ /g,'+').replace(/,/g,'');

        if (processedProfessors.indexOf(professorName) === -1) { //the professor has not been processed yet

            //make note that the professor is now being processed
            processedProfessors.push(professorName);

            //If we already have record of this professor, just use that instead.
            if (exceptions[professorName]) {
                
                findRatings(exceptions[professorName], professorName);
            
            } else {

                var courseId = $(this).find('td').eq(1).html(),
                    rmpsearch;
                    //Create Rate My Professor search URL using the professor name in the correct form.
                    rmpsearch = 'http://www.ratemyprofessors.com/search.jsp?queryBy=teacherName&schoolName=schoolname&queryoption=HEADER&query=PROFESSORNAME&facetSearch=true';
                    rmpsearch = rmpsearch.replace('PROFESSORNAME', URLprofessorName);
                }

                getProfessorExtension(rmpsearch, professorName);
            }
        }     
    });
}

/*
Given an RMP search page, find the numerical extension that corresponds with the the professor's personal RMP page.
*/
function getProfessorExtension(searchPageURL, professorName){

    var xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: searchPageURL,
        professorName: professorName
    };

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {
        var responseXML, professorName, ratings;
        try {

            responseXML = data.responseXML;
            professorName = data.professorName;

            //Find the numerical extension that leads to the specific professor's RMP page.
            var professorURLExtension = $(responseXML).find('.listing:first').find('a:first').attr('href');

            //Check to make sure a result was found
            if (typeof professorURLExtension === 'undefined'){
                changeRMPCells('?','?', professorName);//update RMP cells with empty information
            } else {
                var professorPageURL = 'http://www.ratemyprofessors.com' + professorURLExtension;
                ratings = findRatings(professorPageURL, professorName);
            }
        }
        catch(err) {
            changeRMPCells('?', '?', professorName);//update RMP cells with empty information
        }       
    });
}

/*
Given the url of a specific professor:
Makes a JSON object containing an overall rating, helpfulness rating, clarity rating, and easiness rating.
Then makes a pass to change RMP cells to update each individual cell of the RMP column with this info.
*/
function findRatings(professorPageURL, professorName){
    var xmlRequestInfo = {
        method: 'GET',
        action: 'xhttp',
        url: professorPageURL,
        professorName: professorName
    };

    chrome.runtime.sendMessage(xmlRequestInfo, function(data) {

        var rating = {
            overall: -1,
            helpfulness: -1,
            clarity: -1,
            easiness: -1
        };
        var professorName, professorPageURL, responseXML;
        try {

            professorName = data.professorName;
            professorPageURL = data.url;
            responseXML = data.responseXML;

            //Find the numerical extension that leads to the specific professor's RMP page.
            rating.overall = $(responseXML).find('.grade').html();
            rating.helpfulness = $(responseXML).find('.rating:eq(0)').html();
            rating.clarity = $(responseXML).find('.rating:eq(1)').html();
            rating.easiness = $(responseXML).find('.rating:eq(2)').html();

            //document.write(responseXML);

            //Check to make sure a result was found
            if (parseInt(rating.overall) > 5 || parseInt(rating.overall) <= 0 || isNaN(rating.overall)){
                rating = '?';
            }

        }
        catch(err) {
            rating = '?';
        }

        //Update the new RMP column cells with the new information.
        changeRMPCells(professorPageURL, rating, professorName);
    });
}

/*
Update each individual cell that corresponds with a given professor with the found (or not found) RMP info. 
*/
function changeRMPCells(professorPageURL, rating, professorName){

    $('tbody').find('tr').each(function() {

        var professorCell = $(this).find('td').eq(4).html();
        // console.log(professorCell);
        // console.log(professorName);

        if (professorCell == professorName){

            if (professorPageURL != '?') {

                if (rating != '?' && typeof rating != 'undefined') {

                    $(this).find('td').eq(4).after(
                        '<td><pre>Overall: '+ rating.overall +
                        '\nHelpfulness: '+ rating.helpfulness +
                        '\nClarity: '+ rating.clarity +
                        '\nEasiness: '+ rating.easiness +
                        ' \n<a href="' + professorPageURL + '" target="_blank">More info</a></pre></td>');
                } else {
                    $(this).find('td').eq(4).after(
                        '<td><pre><a href="' + professorPageURL + '" target="_blank">Be the\nfirst to rate!</a><pre></td>'
                    );
                }
            } else {
                $(this).find('td').eq(4).after('<td><pre>No page\nwas found.<pre></td>');
            }
        }
    });
}
