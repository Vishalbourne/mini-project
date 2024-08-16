const express = require("express");
const app = express();
const path = require('path');
const userModel = require("./models/user");
const postModel = require("./models/post")
const allPostsModel = require("./models/allposts")
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const user = require("./models/user");
const upload = require("./config/multerconfig")

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());

app.get("/",function(req,res){
    res.render("index");
})

app.get("/login",function(req,res){
    res.render("login");
})

app.get("/logout",function(req,res){
    res.cookie("token","");
    res.render("login");
})

app.get("/profile/:id", isLoggedin,async function(req,res){
    const userProfile = await userModel.findOne({_id : req.params.id}).populate("posts");
    res.render("profile",{user :userProfile});
})

app.get("/like/:postid",isLoggedin,async function(req,res){
    const postLike = await postModel.findOne({_id : req.params.postid}).populate("user");
    
    
    if(postLike.likes.indexOf(req.user.userid) === -1 ){
        postLike.likes.push(req.user.userid);
    }
    else{
       postLike.likes.splice( postLike.likes.indexOf(req.user.userid),1);
    }
    await postLike.save();
    res.redirect(`/allposts/${req.user.userid}`) ;
})
app.get("/delete/:postid",isLoggedin,async function(req,res){
    const postDelete = await postModel.findOneAndDelete({_id : req.params.postid});
    const Delete = await userModel.findOne({_id:req.user.userid});

    Delete.posts.pop(postDelete._id)
    await Delete.save();
    res.redirect(`/profile/${req.user.userid}`) ;
})

app.get("/upload",isLoggedin,function(req,res){
    res.render("profilepic")
})

//

app.get("/allposts/:id",isLoggedin,async function(req,res){
    const allposts = await postModel.find().populate("user");
    const user = await userModel.findOne({_id : req.user.userid});

    res.render("posts",{allposts,user})
})

app.post('/upload',isLoggedin, upload.single('image'),async function (req, res, next) {
    const user = await userModel.findOne({email:req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect(`/profile/${req.user.userid}`) ;
  })

app.post("/register", async function(req,res){
    let{name,username,age,password,email} = req.body;

    const userAlready = await userModel.findOne({email});
    const userAlready1 = await userModel.findOne({username});
    if(userAlready || userAlready1){
        return res.status(500).send("User already registered");
    }

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {

            const userRegister= await userModel.create({
                name,
                username,
                email,
                age,
                password : hash
            })

            let token = jwt.sign({ email:email,userid : userRegister._id }, 'shhhhh');
            res.cookie("token" ,token);
            res.redirect(`/profile/${userRegister._id}`) ;
        });
    });  
})

app.post("/login",async function(req,res){
     let{email,password} = req.body;

     const userLogin = await userModel.findOne({email});

     if(userLogin){
        bcrypt.compare(password,userLogin.password,function(err,result){
            if(result){
                let token = jwt.sign({ email:email,userid : userLogin._id }, 'shhhhh');
                res.cookie("token" ,token);
                res.redirect(`/profile/${userLogin._id}`) ;
            }
            else{
                res.status(500).redirect("/login");
            }
         })
     }
     else{
        res.status(500).redirect("/login");
     }
})

app.post("/post",isLoggedin, async function(req,res){

    const userProfile = await userModel.findOne({email : req.user.email});
    let{content} = req.body;

    const createdPost = await postModel.create({
        user : userProfile.id,
        content
    })

    userProfile.posts.push(createdPost._id);
    await  userProfile.save();
    res.redirect(`/profile/${req.user.userid}`) ;
})



function isLoggedin(req,res,next){
    
    if(req.cookies.token === ""){
        res.redirect("/login");
    }
    else{
        jwt.verify(req.cookies.token, 'shhhhh', function(err,data ) {
             req.user = data;
          });
    }
    next();
}

app. listen(3000);