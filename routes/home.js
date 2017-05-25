var express = require('express');
var router = express.Router();
var formidable = require('formidable'); 
var  PrivateInfoModel = require('../models/PrivateinfoModel');
var Users = require('../models/UserModel');
var sequelize =require('../models/ModelHeader')();
var Msg = require('../models/MsgModel');

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
       /*console.log( fields)//这里就是post的XXX 的数据 
       console.log( files.idphoto)//这里就是上传的文件,注意,客户端file框必须有name属性 
       console.log('上传的文件名:'+files.idphoto.name);//与客户端file同名 
       console.log('文件路径:'+files.idphoto.path); 
       res.send('rname='+fields.rname);*/
       loginbean = req.session.loginbean;
       fields.id = loginbean.id;
       fields.idphoto=files.idphoto.path.replace('public','');
       fields.userphoto=files.userphoto.path.replace('public','');
       fields.updatime=new Date();
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
});

router.get('/pubShop', function(req, res, next) {
	sql = 'select id,typename from shoptypes';
	sequelize.query()
	res.render('home/pubShop', {});
})

module.exports = router;
