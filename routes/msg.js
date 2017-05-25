var express = require('express');
var router = express.Router();
var sequelize =require('../models/ModelHeader')();
var Msg = require('../models/MsgModel');
var Users = require('../models/UserModel');

//router.get('/', function(req, res, next) {
//	//res.send('hello,华盛');
//	loginbean=req.session.loginbean;
//	res.locals.loginbean = loginbean;
//	Users.update({msgnum:0},{where:{'id':loginbean.id}}).then(function(rs){
//		sql = 'select msgs.*,users.nicheng from msgs,users where toid=? and sendid = users.id ';
//		sequelize.query(sql,{replacements:[loginbean.id]}).spread(function(rs){
//			//console.log(rs);
//			loginbean.msgnum=0;
//			req.session.loginbean = loginbean;
//			res.render('home/home',{rs:rs});
//		})
//	}).catch(function(err){
//			res.send('数据库错误，请稍后重试');
//	})
//	
//});

router.post('/sendnew', function(req, res, next) {
  loginbean = req.session.loginbean
  res.locals.loginbean = req.session.loginbean;
   //接参
  nicheng = req.body.nicheng;
  arr = nicheng.split(';');
  len = arr.length;
 //昵称查找ID
  sql = 'select id from users where nicheng=?';
  flag = 0;
  var exec = function(i){
  toids={}
  return function(){
 sequelize.query(sql,{replacements:[arr[i]]}).then(function(rs){
 	rsjion = JSON.parse(JSON.stringify(rs[0]));
 	if(rsjion.length==0){
 		flag++;
 		return;
 	}
 	toids[i] = rsjion[0].id;
 	//toid = rsjion[0].id;
 	//然后插入消息表
 	sqlmsg = 'insert into msgs set sendid=?,toid=?,message=?';
 	sequelize.query(sqlmsg,{replacements:[loginbean.id,toids[i],req.body.message]}).then(function(rs){
 	sqla = 'update users set msgnum=msgnum+1  where id=?';
    sequelize.query(sqla,{replacements:[toids[i]]}).then(function(rs){
    	  flag++;
    	  if(flag==len){
    	  	res.send('1');
    	  }
    		
    });
 	})
 })
 }
 }
  for(i=0;i<len;i++){
  	fun=exec(i);
  	fun();
  }
});



router.get('/delnew', function(req, res, next) {
	id=req.query.id;
	sql='delete from msgs where id=?';
	sequelize.query(sql,{replacements:[id]}).spread(function(rs){
		res.send('删除成功');
	})
});


module.exports = router;


