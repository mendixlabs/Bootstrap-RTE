module.exports = function(grunt) {
	var pkg= grunt.file.readJSON('package.json');
   grunt.initConfig({
    
		compress: {
			makezip: {
				options: {
				  archive: 'dist/'+pkg.version+'/Bootstrap-RTE.mpk',
				  mode: "zip"
				},
				files:[
					{
					expand: true,
					date: new Date(),
					store: false,
					cwd:"src",
					src: ['**/*']
					}
				]
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.registerTask('default', ['compress:makezip']);
};
