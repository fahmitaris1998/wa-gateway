var express = require("express");
const { processNumber } = require("../utils/process-number");
const createDelay = require("../utils/create-delay");
const whatsapp = require("wa-multi-session");
const { toDataURL } = require("qrcode");
const req = require("express/lib/request");
var router = express.Router();
const axios = require('axios');
const requestIP = require('request-ip');

/**
  @param {import('express').Request} req
  @param {import('express').Response} res
 */

router.use("/api/digiflazz", async(req,res) => {
  try{
    const ipAddress = requestIP.getClientIp(req);
    const toptiershopUrl = 'https://toptiershop.id/api/v1/digiflazz';
    const options = {
      method: 'POST',
      url: toptiershopUrl,
      data: req.body,
    };
    console.log('IP CLIENT ', ipAddress);
    axios
      .request(options)
      .then(function (resData) {
        response = resData.data;
        console.log(response);
        res.status(200).json(response);
      })
      .catch(function (error) {
        console.error(error);
      });
  }catch(error){
    res.status(400).json({
      status: false,
      data: {
        error: error?.message,
      },
    });
  }
})

router.use("/start-session", async (req, res) => {
  try {
    const scan = req.query.scan;
    const sessionName =
      req.body.session || req.query.session || req.headers.session;
    if (!sessionName) {
      throw new Error("Bad Request");
    }
    whatsapp.onQRUpdated(async (data) => {
      if (res && !res.headersSent) {
        const qr = await toDataURL(data.qr);
        if (scan && data.sessionId == sessionName) {
          res.render("scan", { qr: qr });
        } else {
          res.status(200).json({
            qr: qr,
          });
        }
      }
    });
    await whatsapp.startSession(sessionName, { printQR: true });
  } catch (error) {
    // console.log(error);
    res.status(400).json({
      status: false,
      data: {
        error: error?.message,
      },
    });
  }
});
router.use("/delete-session", async (req, res) => {
  try {
    const sessionName =
      req.body.session || req.query.session || req.headers.session;
    if (!sessionName) {
      throw new Error("Bad Request");
    }
    whatsapp.deleteSession(sessionName);
    res.status(200).json({
      status: true,
      data: {
        message: "Success Deleted " + sessionName,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      data: {
        error: error?.message,
      },
    });
  }
});
router.use("/send-message", async (req, res) => {
  try {
    let to = req.body.to || req.query.to,
      text = req.body.text || req.query.text;
    let isGroup = req.body.isGroup || req.query.isGroup;
    let media = req.query.media || req.body.media;
    let send = "";

    console.log(
      "message send from >",
      req.headers["x-forwarded-for"] || req.socket.remoteAddress
    );
    const sessionId =
      req.body.session || req.query.session || req.headers.session;
    if (!to)
      return res.status(400).json({
        status: false,
        data: {
          error: "Bad Request",
        },
      });
    if (!to || !text)
      throw new Error("Tujuan dan Pesan Kosong atau Tidak Sesuai");

    const receiver = processNumber(to);
    if (!sessionId)
      return res.status(400).json({
        status: false,
        data: {
          error: "Session Not Found",
        },
      });
    if(!media){
      var crypto = require("crypto");
      var id = crypto.randomBytes(20).toString('hex');  
      let r = (Math.random() + 1).toString(36).substring(15);
     
      let textfinal = id +" "+ text;
      console.log("INI HASILNYA"+id);
      send = await whatsapp.sendTextMessage({
        sessionId,
        to: receiver,
        text: textfinal,
      });
    }else{
      send = await whatsapp.sendImage({
        sessionId,
        to: receiver,
        text,
        media: media
      });
    }
   

    res.status(200).json({
      status: true,
      data: {
        id: send?.key?.id,
        status: send?.status,
        message: send?.message?.extendedTextMessage?.text || "Not Text",
        remoteJid: send?.key?.remoteJid,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      data: {
        error: error?.message,
      },
    });
  }
});
router.use("/operator",async (req, res)=>{
  if(20%10==0){
    console.log("betoll");
  }else{
    console.log("salahh");
  }
})
router.use("/send-bulk-message", async (req, res) => {
  try {
    const sessionId =
      req.body.session || req.query.session || req.headers.session;
    const media = req.body.media || req.query.media;
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        data: {
          error: "Session Not Found",
        },
      });
    }
    if(!media){
      let buffer=0;
      for (const dt of req.body.data) {
        let r = (Math.random() + 1).toString(36).substring(7);
        buffer += 1;
        if(buffer%2==0){
          await createDelay(60000);
        }else{
          await createDelay(Math.floor(Math.random() * 50)*1000);
        }
        await whatsapp.sendTextMessage({
          sessionId,
          to: processNumber(dt),
          text: r+"\n\n"+req.query.text,
        });
      }
    }else{
      for (const dt of req.body.data) {
        await createDelay(Math.floor(Math.random() * 20)*1000);
        await whatsapp.sendImage({
          sessionId,
          to: processNumber(dt),
          text: req.query.text,
          media: media
        });
      }
    }
    
    console.log("SEND BULK MESSAGE WITH DELAY SUCCESS");

    res.status(200).json({
      status: true,
      data: {
        message: "Bulk Message is Processing",
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      data: {
        error: error?.message,
      },
    });
  }
});
router.use("/sessions", async (req, res) => {
  try {
    const sessions = whatsapp.getAllSession();
    res.status(200).json({
      status: true,
      data: {
        sessions,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      data: {
        error: error?.message,
      },
    });
  }
});

module.exports = router;