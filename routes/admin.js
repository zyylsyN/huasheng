var express = require('express');
var router = express.Router();
var  PrivateInfoModel = require('../models/PrivateinfoModel');
var sequelize =require('../models/ModelHeader')();
var User = require('../models/UserModel');
var Msg = require('../models/MsgModel');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.locals.loginbean = req.session.loginbean;
  res.locals.loginbean = loginbean;
  if (loginbean.role==0) {
  	res.render('admin/adminHome', {});
  }else{
  	res.send('<script>alert("您无权访问");location.href="/";</script>');
  }
});

router.get('/authList', function(req, res, next) {
  res.locals.loginbean = req.session.loginbean;
  res.locals.loginbean = loginbean;
  if (loginbean.role==0) {
  	//--------显示列表----------
  	sql = 'select p.* from users u,privateinfos p where u.role =2 and u.id = p.id';
    sequelize.query(sql).then(function(rs){
    	//res.send(rs[0]);
    	res.render('admin/authList',{rs:rs[0]});
    });
  	//--------------------------
  }else{
  	res.send('<script>alert("您无权访问");location.href="/";</script>');
  }
})

router.get('/authInfo', function(req, res, next){
	
	id = req.query.id;
	PrivateInfoModel.findOne({where:{id:id}}).then(function(rs){
		if(rs!=null){
			res.render('admin/authData', {rs:rs});//读文件发给客户端
		}else{
			res.send("查无此信息");
		}
	});
	
})

router.get('/applyPass', function(req, res, next){
	res.locals.loginbean = req.session.loginbean;
  res.locals.loginbean = loginbean;
  if (loginbean.role==0) {
    id = req.query.id;
    //地址栏id
    sql = 'update users set role=3,msgnum=msgnum+1  where id=?';
    sequelize.query(sql,{replacements:[parseInt(id)],type:sequelize.//转换成int类型
    	QueryTypes.UPDATE}).then(function(rs){
    	sqlmsg = 'insert into msgs set sendid=?,toid=?,message="您的审核已通过，进入空间发布信息"';
    	sequelize.query(sqlmsg,{replacements:[loginbean.id,id]}).then(function(rs){
    		res.redirect('./authlist');
    	})
    })
  }else{
  	res.send('<script>alert("您无权访问");location.href="/";</script>');
  }
	//----查库
})

router.post('/applyRefuse', function(req, res, next){
  loginbean =req.session.loginbean;
  res.locals.loginbean = loginbean;
  if(loginbean.role==0){
  id = req.body.id;
  message=req.body.message;
  //修改users表中role=1，msgum+1
  //msgs插入sendid = logbean.id
//sql  = 'update users set role = 1,msgnum=msgnum+1 where id = ?';
//sequelize.query(sql,{replacements: [parseInt(id)],type:sequelize.
//  QueryTypes.UPDATE}).then(function(rs){
//  sqlmsg = 'insert into msgs set sendid = ?,toid=?,message =?';
//   sequelize.query(sqlmsg,{replacements:[loginbean.id,id,req.body.message]}).then(
//    function(rs){
//      res.redirect('./authList');
//    })   
//  })
//}else{
//  res.send('<script>alert("你无权访问管理员空间");location.href="/";</script>');
//}
//});
sequelize.transaction().then(function (t) {    
            return User.update({role:1,msgnum:sequelize.literal('msgnum+1')},{where:{'id':id}},{transaction:t}).then(function(rs){
              //console.log(rs);
             msg={};
             msg.sendid=loginbean.id;
             msg.toid=id;
             msg.message = message;
             return Msg.create(msg,{transaction:t}).then(function(rs){
             	res.redirect('./authList');
             });
            }).then(t.commit.bind(t)).catch(function(err){
            	t.rollback.bind(t);
            	console.log(err);
            })     
            });
           }else{
    res.send('<script>alert("你无权访问管理员空间");location.href="/";</script>');
      }
    })

module.exports = router;