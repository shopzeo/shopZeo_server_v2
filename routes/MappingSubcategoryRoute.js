const express = require('express');
const router = express.Router();
const mappedsubCategoryController = require('../controllers/mappingSubcategoryController');
// const { authenticate, authorize } = require('../middleware/auth');

router.post('/', mappedsubCategoryController.createSubCategoryChild);
router.get('/', mappedsubCategoryController.getSubCategoriesChildList);
router.get('/:id', mappedsubCategoryController.getSubCategoryChildById);
router.put('/:id', mappedsubCategoryController.updateSubCategoryChild);
router.delete('/:id', mappedsubCategoryController.deleteSubCategoryChild);
router.patch('/:id/toggle', mappedsubCategoryController.toggleSubCategoryChildStatus);
router.get('/export/all', mappedsubCategoryController.exportSubCategoryChildren);
module.exports = router;
