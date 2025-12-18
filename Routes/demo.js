const express=require("express");
const router=express.Router();

router.get("/",(req,res)=>{
    res.send("hello from demo");
})






module.exports=router;  


