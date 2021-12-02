
// pour commander le robot
// http://localhost:3000

// exemple pour faire avancer et recu

var toupiecompt = 0

// port du serveur Web
var port_web = 3000

// à modifier !!!!!!
// dossier contenant les fichiers HTML que le serveur Web pourra envoyer au navigateur
//var rep_html = "/home/malcaor/Prog/OCR/site/index.html"
var rep_html = "C:\Users\msi\Documents\L3 Confinement\OCR\arduino_robot_projetOCR"


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

        console.log("usb : "+chunk)

        // on reçoit la réponse de l'Arduino en JSON
        // exemple d'objet envoyé : {ns: 2, exec : "OK", dist : 43, dist_fiab : 14200}
    
        if (chunk.startsWith("{")) { // on a une réponse JSON
            etat = JSON.parse(chunk)
            console.log("durée séquence n° "+etat.ns+" = "+(Date.now() - time)+ " ms")
            console.log("exec : "+etat.exec)
            for (let index = 0; index < 15; index+=3) {
                console.log("angle : " + etat.dist[index])
                console.log("dist : " + etat.dist[index+1])
            }
            if(etat.dist[7] <= 130){
                console.log("Recule")
                mission = recule
            }else if(etat.dist[1] < 250 && etat.dist[4] < 200 && etat.dist[7] < 250){
                // \
                //  \ 
                // O \
                console.log("Penché droit")
                mission = gauche
            }else if(etat.dist[7] < 250 && etat.dist[10] < 200 && etat.dist[13] < 250){
                //   /
                //  / 
                // / O  
                console.log("Penché gauche")
                mission = droite
            } else if(etat.dist[1] < 250){
                //   |
                // O |
                //   |
                console.log("Coté droit")
                mission = avance
            } else if(etat.dist[13] < 250){
                // | 
                // | O
                // |  
                console.log("Coté gauche")
                mission = avance
            } else if(etat.dist[4] < 250 && etat.dist[7] < 200 && etat.dist[10] < 250){
                // _____
                //   O
                //  
                console.log("Face")
                if(etat.dist[1] <= etat.dist[13])
                {
                    mission = gauche
                }else{
                    mission = droite
                }
            }else if(etat.dist[7] < 130){
                console.log("recule")
                mission = recule
            } else {
                console.log("Toupie")
                mission = toupie
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
function voir_autour_soit() {
    time = Date.now();
    num = 0
    usb.write("[[bl 0]]")
    //mission = null
    console.log("mission voir_autour_soit terminée")
    return
}

function avance(){
    time = Date.now();
    num = 0
    usb.write("[[mga 130][mda 130][t 500]]")
    //mission = null
    console.log("mission avance terminée")
}

function gauche(){
    time = Date.now();
    num = 0
    usb.write("[[mda 130]]")
    //mission = null
    console.log("mission gauche terminée")
}

function droite(){
    time = Date.now();
    num = 0
    usb.write("[[mga 130]]")
    //mission = null
    console.log("mission droite terminée")
}
function toupie(){
    if(toupiecompt>2) {
        toupiecompt = 0
        avance()
    } else{
        toupiecompt = toupiecompt +1
        time = Date.now();
        num = 0
        usb.write("[[mga 130]]")
        //mission = null
        console.log("mission Toupie terminée")
    }
}

function recule(){
    time = Date.now();
    num = 0
    usb.write("[[mgr 130][mdr 130]]")
    //mission = null
    console.log("mission recule terminée")

}