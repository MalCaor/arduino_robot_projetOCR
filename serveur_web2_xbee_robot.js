
// pour commander le robot
// http://localhost:3000

// exemple pour faire avancer et recu

var reculecompte = 0
var soustractionGauche=0
var soustractionDroite=0


// port du serveur Web
var port_web = 3000

// à modifier !!!!!!
// dossier contenant les fichiers HTML que le serveur Web pourra envoyer au navigateur
//var rep_html = "/home/malcaor/Prog/OCR/site/index.html"
var rep_html = "C:/Users/msi/Documents/L3 Confinement/OCR/arduino_robot_projetOCR/index.html"


var fs = require('fs')
var express = require('express')
var usb = require("./usb.js")
const { setTimeout } = require('timers')
const { Console } = require('console')

var time = null;

var mission = null;  // fonction qui gère la mission courante
var cmd_num = null;    // numéro de la séquance courante à exécuter
var etat = null;    // dernière réponse de l'Arduino

var chunk = ""; // on reçoit la réponse de l'Arduino par morceaux


usb.setCallback( function(s) {

    // on attend la réponse de l'Arduino
    // l'Arduino envoie une réponse après l'exécution d'un séquence de commandes
    // quand une réponse arrive, on la mémorise dans etat
    // ensuite on envoie la séquence suivante à l'Arduino


    chunk += s;

    if (chunk.indexOf("\n")) { // si on a reçu toute la ligne de réponse

        //console.log("usb : "+chunk)

        // on reçoit la réponse de l'Arduino en JSON
        // exemple d'objet envoyé : {ns: 2, exec : "OK", dist : 43, dist_fiab : 14200}
    
        if (chunk.startsWith("{")) { // on a une réponse JSON
            etat = JSON.parse(chunk)

            //-----------------AFFICHAGE----------------------
            /*
            console.log("durée séquence n° "+etat.ns+" = "+(Date.now() - time)+ " ms")
            console.log("exec : "+etat.exec)
            for (let index = 0; index < 15; index+=3) {
                console.log("angle : " + etat.dist[index])
                console.log("dist : " + etat.dist[index+1])
            }*/
            //-------------------------------------------------

            if(etat.dist[7] <= 130){
                console.log("----------Recule")
                mission = recule
            }else if(etat.dist[1]<etat.dist[13]){
                console.log("----------Cote Droit")
                soustractionDroite=etat.dist[4]-etat.dist[1]
                mission = droite
            }else{
                console.log("----------Cote Gauche")
                soustractionGauche=etat.dist[10]-etat.dist[13]
                mission = gauche
            }
            console.log("Effectue Mission")
            if (mission != null) mission(); // chaque fois qu'on reçoit une réponse de l'Arduino, on relance la mission
            
        }

        chunk = ""
         
    }
     // note : il faudrait prévoir le cas où l'Arduino ne répond plus
    voir_autour_soit()
})


////////////////////////////// mission avancer_mur /////////////////////////////////////

var cmd_avancer_mur = [
    "[t 0]",                    // init mission
    "[mga 150][mda 150][t 1000]",     // on avance pendant 1 seconde
    "[t 1000]",                       // on attend l'arrêt du robot
]

function avancer_mur() {

    // test d'arrêt
    if (cmd_num > cmd_avancer_mur.length*3) { // on exécute au plus 3 fois la séquence
        mission = null
        console.log("mission avancer_mur terminée")
        return
    }

    time = Date.now();
    console.log("exec "+cmd_avancer_mur[cmd_num%cmd_avancer_mur.length])
    usb.write("[[ns " + cmd_num + "]"+cmd_avancer_mur[cmd_num%cmd_avancer_mur.length]+"]")
    cmd_num++;

}

////////////////////////////// mission aligner /////////////////////////////////////

var cmd_aligner = [
    "[t 0]",                    // init mission
    "[mga 150][mda 150][t 1000]",     // on avance pendant 1 seconde
    "[t 1000]",                       // on attend l'arrêt du robot
    "[mgr 150][mdr 150][t 1000]",      // on recule pendant 1 seconde
    "[t 1000]",                       // on attend l'arrêt du robot
]

function aligner() {

    // test d'arrêt
    if (cmd_num > cmd_aligner.length*2) {
        mission = null
        console.log("mission aligner terminée")
        return
    }

    time = Date.now(); // pour mesurer le temps d'exécution d'une séquence
    console.log("exec "+cmd_aligner[cmd_num%cmd_aligner.length])
    usb.write("[[ns 0]"+cmd_avancer_reculer[cmd_num%cmd_aligner.length]+"]")
    cmd_num++

}

///////////////////////////////// lancement d'une mission //////////////////////////

// on attend 5 secondes avant de démarrer la mission (l'Arduino ne répond pas avant 2 secondes)

setTimeout(() => {
    mission = voir_autour_soit // on va exécuter la fonction avancer_mur
    //mission = aligner; // on va exécuter la fonction aligner
    cmd_num = 0    // numéro de la séquence courante
    mission()
    //mission = null
}, 5000);

////////////////////////////////// custom mission /////////////////////////////////
function wait(){
    time = Date.now();
    num = 0
    usb.write("[[t 1000]]")
    //mission = null
    console.log("wait")
    voir_autour_soit()
    return

}

function voir_autour_soit() {
    time = Date.now();
    num = 0
    usb.write("[[bl 0][t 1000]]")
    //mission = null
    console.log("mission voir_autour_soit terminée")
    return
}

function avance(){
    time = Date.now();
    num = 0
    usb.write("[[mga 170][mda 170][t 1000]]")
    //mission = null
    console.log("mission avance terminée")
    //wait()
}

function gauche(){

    console.log("soustractionGauche : "+soustractionGauche)

    soustractionGauche=(soustractionGauche/10)+150
    if(soustractionGauche<0)soustractionGauche=soustractionGauche*-1
    if(soustractionGauche>255 || soustractionGauche<150) soustractionGauche=150

    console.log("[[mga "+soustractionGauche+"][mda 150]]")
    usb.write("[[mga "+soustractionGauche+"][mda 150]]")     
    
}


function droite(){
    
    console.log("soustractionDroite : "+soustractionDroite)

    soustractionDroite=(soustractionDroite/10)+150
    if(soustractionDroite<0)soustractionDroite=soustractionDroite*-1
    if(soustractionDroite>255 || soustractionDroite<150) soustractionDroite=150

    console.log("[[mda "+soustractionDroite+"][mga 150]]")
    usb.write("[[mda "+soustractionDroite+"][mga 150]]")
        

}



function recule(){
    if(reculecompte>0){
        reculecompte=0
        
        avance()
    }else{
        time = Date.now();
        num = 0
        usb.write("[[mga 250][mdr 250]]")
        
        console.log("mission recule terminée")
        reculecompte++
    }
}



