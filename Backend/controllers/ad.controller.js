const AdModel = require('../models/ad.model');
const fs = require('fs');
const path = require('path');

exports.getActiveAds = async (req, res) => {
  try {
    const ads = await AdModel.getActiveAds();
    res.json({ success: true, data: ads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllAds = async (req, res) => {
  try {
    const ads = await AdModel.getAllAds();
    res.json({ success: true, data: ads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAd = async (req, res) => {
  try {
    const { title, isActive, placement } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพโฆษณา' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const newAd = await AdModel.createAd({
      title,
      imageUrl,
      isActive: isActive === 'true' || isActive === true,
      placement: placement || 'home'
    });

    res.status(201).json({ success: true, data: newAd });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAd = async (req, res) => {
  try {
    const { title, isActive, placement } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    if (placement !== undefined) updateData.placement = placement;

    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
      const oldAd = await AdModel.getAdById(req.params.id);
      if (oldAd && oldAd.imageUrl) {
        try {
          const filePath = path.join(__dirname, '..', oldAd.imageUrl);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Failed to delete old ad image:', err);
        }
      }
    }

    const ad = await AdModel.updateAd(req.params.id, updateData);
    if (!ad) {
      return res.status(404).json({ error: 'ไม่พบโฆษณานี้' });
    }

    res.json({ success: true, data: ad });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAd = async (req, res) => {
  try {
    const ad = await AdModel.getAdById(req.params.id);
    if (!ad) {
      return res.status(404).json({ error: 'ไม่พบโฆษณานี้' });
    }
    
    await AdModel.deleteAd(req.params.id);

    // Delete file
    if (ad.imageUrl) {
      try {
        const filePath = path.join(__dirname, '..', ad.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete ad image:', err);
      }
    }

    res.json({ success: true, message: 'ลบโฆษณาเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
