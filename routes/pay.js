var express = require('express');
var router = express.Router();
var GoodsModel = require('../models/GoodsModel');
var ShoppingModel = require('../models/ShoppingModel');
var sequelize =require('../models/ModelHeader')();

/* GET home page. */
router.get('/putshopping', function(req, res, next) {
	loginbean = req.session.loginbean;
	if(typeof(loginbean)=='undefined'){
		res.send('<script>alert("您没登陆,请登陆后操作");window.close();</script>');
		return;
	}
  //res.locals.loginbean = loginbean;
  //--------查询goods表--------------------------
  goodsid = req.query.goodsid;
  
  GoodsModel.findOne({where:{id:goodsid}}).then(function(goodsRs){
          //--------插入购物意向表----------------------
          syl = {
          	goodsid:goodsid,
          	uid:loginbean.id,
          	price:goodsRs.price,
          	num:1,
          	shopid:goodsRs.shopid,
          	creattime:new Date()
          };
          ShoppingModel.create(syl).then(function(rs){
	          console.log(rs);
	          //--------查询购物意向表---------------------
	          sql = 'select s.id as shoppingid,g.id as goodsid,g.goodsimg,g.goodsname,s.price,s.num,g.shopid from  shoppings s,goods g where s.uid=? and s.orderid=0 and s.goodsid=g.id';
	          sequelize.query(sql,{replacements: [loginbean.id],type: sequelize.QueryTypes.QUERY}).then(function(shopList){
	          	//--------显示购物车---------------------------
	          	rsjson = JSON.parse(JSON.stringify(shopList[0]));
	          	res.render('buy/shoppingcar',{shopList:rsjson});
	          });
	       }).catch(function(err){
	          if(err.errors[0].path=='shoppinguniq')
			  {
				ShoppingModel.update({num:sequelize.literal('num+1')},{where:{'goodsid':goodsid,'uid':loginbean.id,'orderid':0}}).then(function(rs){
					//--------查询购物意向表---------------------
			          sql = 'select s.id as shoppingid,s.shopid as shopid,g.id as goodsid,g.goodsimg,g.goodsname,s.price,s.num,g.shopid from  shoppings s,goods g where s.uid=? and s.orderid=0 and s.goodsid=g.id';
			          sequelize.query(sql,{replacements: [loginbean.id],type: sequelize.QueryTypes.QUERY}).then(function(shopList){
			          	//--------显示购物车---------------------------
			          	rsjson = JSON.parse(JSON.stringify(shopList[0]));
	          			res.render('buy/shoppingcar',{shopList:rsjson});
			          });
				})
			  }else{
			  	res.send('数据库错误,请稍后再试');
			  }
	          // res.send('创建失败');
	       })

  });
});


router.get('/createorder', function(req, res, next) {
	loginbean = req.session.loginbean;
	if(typeof(loginbean)=='undefined'){
		res.send('<script>alert("您没登陆,请登陆后操作");window.close();</script>');
		return;
	}

	orderStr = req.query.orderStr;
	orderArr = orderStr.split(',');
	len = orderArr.length;
	obj = {};
	ii=1;
	shoppingids='';
	for(i=1;i<len;i++){
		v = orderArr[i];
		tempArr = v.split('_');
		shopid = tempArr[0];		//商店id
		goodsid = tempArr[1];		//商品id

		if(!obj[shopid]){
			obj[shopid]=[];
		}
		

		sql = 'select shoppings.id as shoppingid,shoppings.goodsid,shoppings.price,shoppings.num,shops.id as shopid,shops.shopname,goods.id as goodsid,goods.goodsname from shoppings,goods,shops where shoppings.goodsid=? and shoppings.uid=? and shoppings.goodsid=goods.id and shoppings.shopid=shops.id and shoppings.orderid=0';
		sequelize.query(sql,{replacements: [goodsid,loginbean.id],type: sequelize.QueryTypes.QUERY}).then(function(gRs){
	      	rsjson = JSON.parse(JSON.stringify(gRs[0]));
	      	obj[shopid].push(rsjson[0]);
	      	obj[shopid].shopname=rsjson[0].shopname;
	      	shoppingids += ','+rsjson[0].shoppingid;
	      	ii++;
	      	if(ii==len){
	      		// console.log(obj);
	      		// for(key in obj){
	      		// 	console.log('shopid='+key);
	      		// 	console.log(obj[key]);
	      		// }
	      		res.render('buy/order',{rs:obj,shoppingids:shoppingids});
	      	}
	      	
	    });

	}
})

router.get('/surepay', function(req, res, next) {
	loginbean = req.session.loginbean;
	if(typeof(loginbean)=='undefined'){
		res.send('<script>alert("您没登陆,请登陆后操作");window.close();</script>');
		return;
	}

	ids = req.query.ids;
	shoppingidArr = ids.split(',');
	len = shoppingidArr.length;
	shopObj={};			//shopid为键,{总价,shoppingids}
	ii=1;
	for(i=1;i<len;i++){
		sql = 'select shopid,price,num from shoppings where id=? and uid=?';
		let shoppingid = shoppingidArr[i];
		sequelize.query(sql,{replacements: [shoppingid,loginbean.id],type: sequelize.QueryTypes.QUERY}).then(function(rs){
			rsjson = JSON.parse(JSON.stringify(rs[0]));
	      	item = rsjson[0];
	      	if(shopObj[item.shopid]){
	      		tempObj = shopObj[item.shopid];
	      		tempObj.total += item.price*item.num;
	      		tempObj.ids.push(shoppingid);
	      		shopObj[item.shopid]=tempObj;
	      	}else{
	      		shopObj[item.shopid]={};
	      		shopObj[item.shopid].total = item.price*item.num;
	      		shopObj[item.shopid].ids = [shoppingid];

	      	}
	      	ii++;
	      	if(ii==len){
	      		//---------插入订单表--------------
	      		kk=1;

	      		for(shopid in shopObj){
	      			sqlorder = 'insert into orders set total=?,uid=?,shopid=?';
	      			sequelize.query(sqlorder,{replacements: [shopObj[shopid].total,loginbean.id,shopid],type: sequelize.QueryTypes.INSERT}).then(function(orderid){
	      				console.log(orderid); //rs是sequelize返回刚插入的流水id
	      				ids = shopObj[shopid].ids;	//要修改的购物意向商品id数组
	      				console.log('----------------------');
	      				console.log(ids);
	      				console.log('----------------------');
	      				shopObj[shopid].idslen = ids.length;
	      				//idsLen = ids.length;
	      				for(n=0;n<shopObj[shopid].idslen;n++){
	      					updSql = 'update shoppings set orderid=? where id=?';
	      					sequelize.query(updSql,{replacements: [orderid,ids[n]],type: sequelize.QueryTypes.UPDATE}).then(function(updRs){
	      						kk++;
	      						if(kk==len){
	      							res.send('订单创建完成');
	      						}
	      					});
	      				}
	      			});
	      		}
	      	}
		});
	}

})


module.exports = router;
