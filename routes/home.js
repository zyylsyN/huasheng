var express = require('express');
var router = express.Router();
var formidable = require('formidable');
var PrivateInfoModel = require('../models/PrivateInfoModel');
var Users = require('../models/UserModel');
var Msg = require('../models/MsgModel');
var ShopModel = require('../models/ShopModel');
var GoodsModel = require('../models/GoodsModel');
var sequelize =require('../models/ModelHeader')();

/* GET home page. */
router.get('/', function(req, res, next) {
  loginbean = req.session.loginbean;
  res.locals.loginbean = loginbean;
  if(loginbean.role>0){
    cpage=1;
    if(req.query.cpage){
      cpage=req.query.cpage;
    }
    pageItem=3;    //每页显示条目数
    startPoint = (cpage-1)*pageItem; //查询起点位置
    rowCount=0;   //总记录数
    sumPage=0;

    //----------查询消息列表-------------------
    sqlCount = 'select count(*) as count  from msgs where toid=?';
    sequelize.query(sqlCount,{replacements: [loginbean.id],type: sequelize.QueryTypes.QUERY}).then(function(rs){
        rsjson = JSON.parse(JSON.stringify(rs[0]));
        rowCount=rsjson[0].count;
        sumPage=Math.ceil(rowCount/pageItem);//Math.floor,Math.round
        sql = 'select m.*,u.nicheng  from msgs m,users u where m.toid=? and m.sendid=u.id limit ?,?';
        sequelize.query(sql,{replacements: [loginbean.id,startPoint,pageItem],type: sequelize.QueryTypes.QUERY}).then(function(rs){
          res.render('home/home', {rs:rs[0]});
        });
    })
    //Msg.findAll({where:{toid:loginbean.id}}).then(function(rs){
    
  }else{
    res.send('<script>alert("你无权访问此页面");location.href="/";</script>');
  }
 
});

router.post('/privateAuth', function(req, res, next) {
	var form = new formidable.IncomingForm();   //创建上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/privateauth/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
        if(err){ 
            console.log(err); 
            return;
        } 
       //res.send('rname='+fields.realname);
       //-----------入库------------
       loginbean = req.session.loginbean;
       fields.id = loginbean.id;
       fields.idphoto=files.idphoto.path.replace('public','');
       fields.userphoto=files.userphoto.path.replace('public','');
       fields.updtime=new Date();
       //------------启动事物----------------------------------
       sequelize.transaction().then(function (t) {
           return PrivateInfoModel.create(fields).then(function(rs){
            //------修改User表中的role为2------
            return Users.update({role:2},{where:{'id':loginbean.id}}).then(function(rs){
              //console.log(rs);
              loginbean.role=2;
              req.session.loginbean=loginbean;
              res.send('身份认证已提交,请耐心等待审核');
            });
          }).then(t.commit.bind(t)).catch(function(err){
            t.rollback.bind(t);
            console.log(err);
            if(err.errors[0].path=='PRIMARY'){
              res.send('你已经申请过');
            }else if(err.errors[0].path=='idcodeuniq')
            {
              res.send('身份证号已用过');
            }else if(err.errors[0].path=='prphoneuniq'){
              res.send('电话号码已用过');
            }else if(err.errors[0].path=='premailuniq'){
              res.send('此email已用过');
            }else{
              res.send('数据库错误,稍后再试');
            }
          })
          
        });
      //-----------------结束事物---------------------------------------
    })
})


router.get('/pubShop', function(req, res, next) {
  sql = 'select id,typename from shoptypes';
  sequelize.query(sql).then(function(rs){
    res.render('home/pubShop', {shoptypeRs:rs[0]});
  });
})

router.post('/pubShop', function(req, res, next) {
  var form = new formidable.IncomingForm();   //创建上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/shop/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
        if(err){ 
            console.log(err); 
            return;
        } 
       //res.send('rname='+fields.realname);
       //-----------入库------------
       loginbean = req.session.loginbean;
       fields.uid = loginbean.id;
       fields.photourl=files.photourl.path.replace('public','');
       //------------启动事物----------------------------------
       sequelize.transaction().then(function (t) {
           return ShopModel.create(fields).then(function(rs){
            //------修改User表中的role为2------
            return Users.update({role:4},{where:{'id':loginbean.id}}).then(function(rs){
              //console.log(rs);
              loginbean.role=4;
              req.session.loginbean=loginbean;
              res.redirect('./shopmanage');
            });
          }).then(t.commit.bind(t)).catch(function(err){
            t.rollback.bind(t);
            console.log(err);
            res.send('店铺发布失败，请重新发布');
          })
          
        });
      //-----------------结束事物---------------------------------------
    })
})

router.get('/shopmanage', function(req, res, next) {
  //------判定权限-----------
  loginbean = req.session.loginbean;
  if(loginbean.role==4){
    //------查询出店铺位置信息--------------
    sql = 'select id,shopname,lng,lat from shops where uid=?';
    sequelize.query(sql,{replacements: [loginbean.id]}).then(function(shopRs){
        //------用店铺信息渲染地图界面----------
        sql = 'select id,typename from shoptypes';
        sequelize.query(sql).then(function(shoptypeRs){
          //-------查询店铺中的商品列表------------
          page=1;
          if(req.query.page){
            page=req.query.page;
          }
          pageSize=2;
          GoodsModel.count({where:{uid:loginbean.id}}).then(function(countRs){

            GoodsModel.findAll({where:{uid:loginbean.id},offset:(page-1)*pageSize,limit:pageSize}).then(function(goodsRs){
              res.render('home/shopmanage', {shoptypeRs:shoptypeRs[0],shopRs:shopRs[0],goodsRs:goodsRs,tagflag:req.query.tagflag});
            });

          });//--------GoodsModel.count------
          
        });//--------sequelize.query(sql)-----
    })

  }else{
    res.send("你还没发布营业点");
  }
})


router.post('/pubgoods', function(req, res, next) {
    var form = new formidable.IncomingForm();   //创建上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/goods/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
        if(err){ 
            console.log(err); 
            return;
        } 
       //-----------入库------------
       loginbean = req.session.loginbean;
       fields.uid = loginbean.id;
       fields.goodsimg=files.goodsimg.path.replace('public','');
       console.log('----------------------');
       console.log(fields.editorValue);
       console.log('----------------------');
       fields.goodsintro=fields.editorValue;
       fields.createtime=new Date();
       //------------启动事物----------------------------------
       GoodsModel.create(fields).then(function(rs){
          console.log(rs);
          res.redirect('./shopmanage?tagflag=1');
       }).catch(function(err){
          console.log(err);
          res.send('创建失败');
       })
       
      //-----------------结束事物---------------------------------------
    })
})

router.post('/updgoods', function(req, res, next) {
    var goodsid = req.query.id;
    var form = new formidable.IncomingForm();   //创建上传表单 
    form.encoding = 'utf-8';        //设置编辑 
    form.uploadDir = './public/images/goods/';     //设置上传目录 文件会自动保存在这里 
    form.keepExtensions = true;     //保留后缀 
    form.maxFieldsSize = 5 * 1024 * 1024 ;   //文件大小5M 
    form.parse(req, function (err, fields, files) { 
        if(err){ 
            console.log(err); 
            return;
        } 
       //-----------入库------------
       loginbean = req.session.loginbean;
       fields.uid = loginbean.id;
       if(files.goodsimg.name){
         fields.goodsimg=files.goodsimg.path.replace('public','');
       }else{
         fields.goodsimg=fields.oldGoodsImg;
         console.log(fields.goodsimg);
       }
       fields.goodsintro=fields.editorValue;
       //------------启动事物----------------------------------
       GoodsModel.update(fields,{where:{'id':goodsid}}).then(function(rs){
          console.log(rs);
          res.redirect('./shopmanage?tagflag=1');
       }).catch(function(err){
          console.log(err);
          res.send('创建失败');
       })
       
      //-----------------结束事物---------------------------------------
    })
})


router.get('/getGoodsInfo', function(req, res, next) {
  goodsid = req.query.id;
  GoodsModel.findOne({where:{id:goodsid}}).then(function(goodsInfo){
              res.send(goodsInfo);
  });

})

module.exports = router;